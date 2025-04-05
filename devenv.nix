{ config, inputs, lib, pkgs, ... }:

let
  pkgs-unstable =
    import inputs.nixpkgs-unstable { system = pkgs.stdenv.system; };
in {
  cachix.enable = false;

  # Nix can't (or I can't) expand the $HOME variable during evaluation,
  # so the environment variable ends up containing the literal $HOME
  # string instead of the expanded/resolved value of the user's home directory.
  # Because of this, we're setting the variable from the context of the shell.
  enterShell = ''
    export SOPS_AGE_KEY_FILE=$HOME/.config/age/identities.txt
  '';

  env = {
    AGE_ROOT_PUBLIC_KEY =
      "age1zwls895rxugu2kf6f4ys6pgl36e3k7dx4djt3dl9ckdmcgg3naaqs9qjae";
    BIOME_BINARY = "${pkgs.biome}/bin/biome";
    CARGO_TARGET_DIR = "${config.env.TAURI_ROOT}/target";
    QUASAR_ROOT = "${config.env.DEVENV_ROOT}/src-quasar";
    ROOT_KEY_FILE = "./encrypted/root-key.sops.json";
    TAURI_ROOT = "${config.env.DEVENV_ROOT}/src-tauri";
  };

  languages = {
    javascript = {
      enable = true;

      bun = {
        enable = true;

        install.enable = true;
      };

      directory = "${config.env.QUASAR_ROOT}";
    };

    rust = {
      enable = true;

      # https://devenv.sh/reference/options/#languagesrustchannel
      channel = "stable";

      targets = [ "aarch64-apple-darwin" "wasm32-unknown-unknown" ];

      components = [
        "rustc"
        "cargo"
        "clippy"
        "rustfmt"
        "rust-analyzer"
        "rust-src"
        "rust-std"
      ];
    };

    typescript.enable = true;
  };

  git-hooks = {
    hooks = {
      biome = {
        after = [ "commitizen" ];
        args = [ "--no-errors-on-unmatched" ];
        enable = true;
        fail_fast = true;
      };

      clippy = {
        after = [ "rustfmt" ];
        enable = true;
        settings.offline = lib.mkDefault false;
        extraPackages = [ pkgs.openssl ];
      };

      commitizen = {
        before = [ "biome" ];
        enable = true;
        fail_fast = true;
      };

      eslint = {
        after = [ "biome" ];
        args = [ "-c" "${config.env.QUASAR_ROOT}/eslint.config.js" ];
        enable = true;
        fail_fast = true;
        files = "\\.(ts|js|mjs|cjs|vue)$";

        settings = {
          binPath = "${config.env.QUASAR_ROOT}/node_modules/.bin/eslint";
        };
      };

      rustfmt = {
        after = [ "eslint" ];
        enable = true;
        fail_fast = true;
      };
    };

    settings.rust.cargoManifestPath = "${config.env.TAURI_ROOT}/Cargo.toml";
  };

  packages = [
    pkgs.age
    # Compiler infrastructure and toolchain library for WebAssembly, in C++; use a newer version of wasm-opt
    pkgs.binaryen
    pkgs.cargo-tauri
    pkgs.nodejs
    pkgs.wasm-pack
  ] ++ lib.optionals pkgs.stdenv.isDarwin (with pkgs.darwin.apple_sdk;
    [ frameworks.Security ]); # TODO: Look into why this is needed

  processes.tauri-dev.exec = "tauri-cli dev";

  scripts = {
    age-generate-identity.exec = ''
      AGE_DIR="$HOME/.config/age"
      IDENTITIES_FILE="$AGE_DIR/identities.txt"

      if [ ! -d "$AGE_DIR" ]; then
          echo "- Creating age config directory at $AGE_DIR" | ${pkgs.gum}/bin/gum format

          mkdir -p "$AGE_DIR"
      fi

      echo "- Generating a new age identity" | ${pkgs.gum}/bin/gum format

      NEW_IDENTITY=$(age-keygen 2>/dev/null)

      # NEW_IDENTITY=$(age-keygen 2>/dev/null)

      # Check if the identities file exists
      if [ ! -f "$IDENTITIES_FILE" ]; then
          echo "- Creating identities file at $IDENTITIES_FILE" | ${pkgs.gum}/bin/gum format

          echo "$NEW_IDENTITY" > "$IDENTITIES_FILE"
      else
          echo "- Appending new identity to $IDENTITIES_FILE" | ${pkgs.gum}/bin/gum format

          echo "$NEW_IDENTITY" >> "$IDENTITIES_FILE"
      fi

      echo "- Identity generation complete." | ${pkgs.gum}/bin/gum format

      # Extract the public key from the new identity and print it
      PUBLIC_KEY=$(echo "$NEW_IDENTITY" | grep "^# public key:" | awk '{print $NF}')

      NEW_PUBLIC_KEY_LABEL=$(${pkgs.gum}/bin/gum style --foreground 212 "New Public Key:")
      PUBLIC_KEY_CONTENT=$(${pkgs.gum}/bin/gum style --foreground white "$PUBLIC_KEY")
      KEY_BANNER_CONTENT=$(${pkgs.gum}/bin/gum join --align center --vertical "$NEW_PUBLIC_KEY_LABEL" "" "$PUBLIC_KEY_CONTENT")

      ${pkgs.gum}/bin/gum style --border normal --border-foreground 45 --padding "1 2" "$KEY_BANNER_CONTENT"
    '';

    backend.exec = ''
      (cd ${config.env.TAURI_ROOT} && exec "$@")
    '';

    frontend.exec = ''
      (cd ${config.env.QUASAR_ROOT} && exec "$@")
    '';

    quasar-cli.exec = ''
      (cd ${config.env.QUASAR_ROOT} && bunx @quasar/cli "$@")
    '';

    # This is a wrapper around SOPS to cleanly work with an envelope encryption approach.
    #
    # There is a root key/identity/age recipient that can decrypt the Tauri updater keys file
    # (./encrypted/tauri-updater.sops.json). _That_ recipient is encrypted via SOPS in the
    # ./encrypted/root-key.sops.json file; the recipients allowed to decrypt the root key are
    # able to be updated out-of-band, without needing to touch or modify anything encrypted by
    # the root recipient. In order to read and operate on data encrypted by the root recipient
    # we must first decrypt the file containing the root recipient's private key, and then use
    # that key to decrypt the data.
    #
    # This wrapper makes that very simple - it detects when the root key was used to encrypt
    # the file being operated upon, and then acquires/configures the root key for use before
    # actually invoking SOPS on the file.
    sops.exec = let sops = "${pkgs-unstable.sops}/bin/sops";
    in ''
      # If no arguments are passed, show SOPS help.
      if [ "$#" -eq 0 ]; then
        exec ${sops} --help
      fi

      # Determine whether we're in exec-env mode or normal mode.
      if [ "$1" = "exec-env" ]; then
        if [ "$#" -lt 3 ]; then
          exit 1
        fi

        MODE="exec-env"

        TARGET="$2"
        shift 2
        COMMAND=("$@")
      else
        MODE="normal"
        # In normal mode the last argument is the target file,
        # and the preceding arguments is the SOPS command.
        TARGET="''${!#}"
        COMMAND=("''${@:1:$#-1}")
      fi

      if [ ! -f "$TARGET" ]; then
        exit 1
      fi

      # Check if the target file contains any SOPS Age metadata.
      if ! ${pkgs.jq}/bin/jq -e '.sops.age[].recipient' "$TARGET" >/dev/null 2>&1; then
        if [ "$MODE" = "exec-env" ]; then
          exec ${sops} exec-env "$TARGET" -- "''${COMMAND[@]}"
        else
          exec ${sops} "''${COMMAND[@]}" "$TARGET"
        fi
      fi

      # The target file has Age metadata; now check specifically for the root key recipient.
      if ${pkgs.jq}/bin/jq -r '.sops.age[].recipient' "$TARGET" | grep -qF "$AGE_ROOT_PUBLIC_KEY"; then
        if [ "$MODE" = "exec-env" ]; then
          exec env SOPS_AGE_KEY="$( \
            ${sops} decrypt --extract '["dirtywaveUpdaterRootPrivateKey"]' "$ROOT_KEY_FILE" \
          )" \
          ${sops} exec-env "$TARGET" -- "''${COMMAND[@]}"
        else
          exec env SOPS_AGE_KEY="$( \
            ${sops} decrypt --extract '["dirtywaveUpdaterRootPrivateKey"]' "$ROOT_KEY_FILE" \
          )" \
          ${sops} "''${COMMAND[@]}" "$TARGET"
        fi
      else
        if [ "$MODE" = "exec-env" ]; then
          exec ${sops} exec-env "$TARGET" -- "''${COMMAND[@]}"
        else
          exec ${sops} "''${COMMAND[@]}" "$TARGET"
        fi
      fi
    '';

    tauri-cli.exec = ''
      (cd ${config.env.TAURI_ROOT} && cargo-tauri "$@")
    '';
  };

  tasks = {
    "dirtywave-updater:bootstrap:install-cargo-tauri" = {
      after = [ "devenv:enterShell" ];

      exec = ''
        echo "Tauri CLI not installed; installing"

        cargo install tauri-cli --version "^2.0.0" --locked
      '';

      status =
        "test -f ${config.env.DEVENV_STATE}/cargo-install/bin/cargo-tauri";
    };
  };

  # See full reference at https://devenv.sh/reference/options/
}
