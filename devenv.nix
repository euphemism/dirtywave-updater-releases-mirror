{ config, pkgs, lib, ... }:

{
  cachix.enable = false;

  env = {
    BIOME_BINARY = "${pkgs.biome}/bin/biome";
    CARGO_TARGET_DIR = "${config.env.TAURI_ROOT}/target";
    QUASAR_ROOT = "${config.env.DEVENV_ROOT}/src-quasar";
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
    pkgs.binaryen # use a newer version of wasm-opt
    pkgs.nodejs
    pkgs.wasm-pack
  ] ++ lib.optionals pkgs.stdenv.isDarwin (with pkgs.darwin.apple_sdk;
    [ frameworks.Security ]); # TODO: Look into why this is needed

  processes.tauri-dev.exec = "tauri-cli dev";

  scripts = {
    backend.exec = ''
      cd ${config.env.TAURI_ROOT}

      exec "$@"
    '';

    frontend.exec = ''
      cd ${config.env.QUASAR_ROOT}

      exec "$@"
    '';

    quasar-cli.exec = ''
      cd ${config.env.QUASAR_ROOT}

      bunx @quasar/cli "$@"
    '';

    tauri-cli.exec = ''
      cd ${config.env.TAURI_ROOT}

      cargo-tauri "$@"
    '';
  };

  tasks = {
    "dirt-loader:install-cargo-tauri" = {
      exec = ''cargo install tauri-cli --version "^2.0.0" --locked'';

      status =
        "test -f ${config.env.DEVENV_STATE}/cargo-install/bin/cargo-tauri";
    };

    "devenv:enterShell".after = [ "dirt-loader:install-cargo-tauri" ];
  };

  # See full reference at https://devenv.sh/reference/options/
}
