{ config, inputs, lib, pkgs, ... }:

let
  # Source of truth.
  # Automatically propagates to src-tauri/Cargo.toml and src-quasar/package.json
  application-version = "0.2.1";

  pkgs-unstable = import inputs.nixpkgs-unstable {
    overlays = [ inputs.rust-overlay.overlays.default ];
    system = pkgs.stdenv.system;
  };
in {
  imports = [ ./devenv/outputs ];

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
    PINIA_STORE_PATH = "${config.env.DEVENV_STATE}/pinia";
    QUASAR_ROOT = "${config.env.DEVENV_ROOT}/src-quasar";
    ROOT_KEY_FILE = "./encrypted/root-key.sops.json";
    TAURI_ROOT = "${config.env.DEVENV_ROOT}/src-tauri";
    TAURI_UPDATER_KEY_FILE = "./encrypted/tauri-updater.sops.json";
  };

  languages = {
    javascript = {
      enable = true;

      bun = {
        enable = true;

        install.enable = false; # true;
      };

      directory = "${config.env.QUASAR_ROOT}";
    };

    rust = {
      enable = true;

      # https://devenv.sh/reference/options/#languagesrustchannel
      channel = "stable";

      # Error failed to build app:
      # - Target x86_64-apple-darwin is not installed (installed targets: aarch64-apple-darwin, thumbv6m-none-eabi, x86_64-unknown-linux-gnu). Please run `rustup target add x86_64-apple-darwin`.
      targets = [
        "aarch64-apple-darwin"
        "wasm32-unknown-unknown"
        "x86_64-apple-darwin"
        "x86_64-pc-windows-gnu"
        "x86_64-unknown-linux-gnu"
      ];

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
        # TODO: Temporary mitigation to address commitizen force-pushing over a release and changing the hash. Should be able to remove in a few days (Currently 2025-10-05).
        package = pkgs-unstable.commitizen;
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

  outputs = let

    # Strongly typed target descriptor
    TargetType = lib.types.submodule {
      options = {
        system = lib.types.str;
        rustTarget = lib.types.str;
        arch = lib.types.str;
        platform = lib.types.anything;
      };
    };

    validateTarget = name: target:
      let
        required = [ "rustTarget" "stdenv" ]; # "arch" "platform" ];
        missing =
          builtins.filter (attr: !builtins.hasAttr attr target) required;
      in lib.asserts.assertMsg (missing == [ ])
      "Invalid target '${name}': missing attributes: ${
        lib.concatStringsSep ", " missing
      }";

    mkTarget = systemStr:
      { rustTargetOverride ? null, cross ? false }:
      let
        platform = pkgs.lib.systems.elaborate systemStr;
        rustTarget = if rustTargetOverride != null then
          rustTargetOverride
        else
          platform.rust.rustcTarget;
        stdenv' = if cross then pkgs.pkgsCross.mingwW64.stdenv else pkgs.stdenv;
      in {
        platform = platform;
        rustTarget = rustTarget;
        arch = platform.parsed.cpu.name;
        stdenv = stdenv';
      };

    # mkTarget = systemStr: { rustTargetOverride ? null }:
    #   let
    #     platform = pkgs.lib.systems.elaborate systemStr;
    #     rustTarget = if rustTargetOverride != null then rustTargetOverride else platform.rust.rustcTarget;
    #   in {
    #     system = pkgs.stdenv.buildPlatform.system; # system = systemStr;
    #     platform = platform;
    #     rustTarget = rustTarget;
    #     arch = platform.parsed.cpu.name;
    #   };

    targets = {
      macos = mkTarget "aarch64-darwin" { };
      # macos = {
      #   rustTarget = "aarch64-apple-darwin";
      #   stdenv = pkgs.stdenv;
      # };
      windows = {
        rustTarget = "x86_64-pc-windows-msvc";
        stdenv =
          pkgs.stdenv; # Need this for ...-windows-gnu: pkgs.pkgsCross.mingwW64.stdenv;
      };
      # windows = {
      #   rustTarget = "x86_64-pc-windows-gnu";
      #   stdenv = pkgs.pkgsCross.mingwW64.stdenv;
      # };

      linux = mkTarget "x86_64-linux" { };
      windows-via-macos = mkTarget "aarch64-darwin" {
        rustTargetOverride = "x86_64-pc-windows-gnu";
        cross = true;
      };
      windows-via-linux = mkTarget "x86_64-linux" {
        rustTargetOverride = "x86_64-pc-windows-gnu";
        cross = true;
      };
      # windows = mkTarget pkgs.stdenv.hostPlatform.system {
      #   rustTargetOverride = "x86_64-pc-windows-gnu";
      #   cross = true;
      # };
    };

    # targets = {
    #   macos = mkTarget "aarch64-darwin";
    #   windows = mkTarget "x86_64-windows";
    #   linux = mkTarget "x86_64-linux";
    # };

    buildForTarget = { rustTarget, stdenv, ... }:
      let
        isWindowsGnu = rustTarget == "x86_64-pc-windows-gnu";
        isWindowsMsvc = rustTarget == "x86_64-pc-windows-msvc";

        rustToolchain = pkgs-unstable.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" ];
          targets = [ rustTarget ];
        };

        # Cross pkgs for Windows
        winPkgs = pkgs.pkgsCross.mingwW64;

        # IMPORTANT: use makeRustPlatform from the *same pkgs set* as stdenv
        # so that cross metadata is consistent
        rustPlatform = if isWindowsGnu then
          winPkgs.makeRustPlatform {
            cargo = rustToolchain;
            rustc = rustToolchain;
          }
        else
          pkgs.makeRustPlatform {
            cargo = rustToolchain;
            rustc = rustToolchain;
          };

        nativeBuildInputs = [
          pkgs.cargo-tauri
          pkgs.rsync
          pkgs.bun
          inputs.bun2nix.packages."${pkgs.stdenv.system}".default
          pkgs.makeWrapper
          pkgs.pkg-config
        ] ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux
          [ pkgs.wrapGAppsHook4 ]
          ++ lib.optionals isWindowsMsvc [ pkgs.cargo-xwin pkgs.lld pkgs.nsis ];
      in rustPlatform.buildRustPackage (finalAttrs: {
        inherit stdenv;
        inherit nativeBuildInputs;

        auditable = false;

        pname = "dirtywave-updater";
        version = application-version;
        src = lib.cleanSource ./.;

        # No manual --target; stdenv drives it
        # cargoBuildFlags = [ "--target" rustTarget ];
        # tauriBuildFlags = [ "--no-bundle" "--target" rustTarget ];
        doCheck = false;
        dontTauriInstall = true;
        dontPatchElf = isWindowsGnu || isWindowsMsvc;

        postPatch = ''
          rsync -a --copy-links --chmod=ugo+w --exclude=".bin" ${finalAttrs.bunNodeModules}/node_modules/ src-quasar/node_modules/

          mkdir -p src-quasar/node_modules/.bin

          for target in ${finalAttrs.bunNodeModules}/node_modules/.bin/*; do
            name=$(basename "$target")
            real=$(readlink -f "$target")

            rm -f "src-quasar/node_modules/.bin/$name"

            # makeWrapper ${pkgs.nodejs}/bin/node "src-quasar/node_modules/.bin/$name" \
            makeWrapper ${pkgs.bun}/bin/bun "src-quasar/node_modules/.bin/$name" \
              --add-flags "$real"
          done
        '';

        # postPatch = ''
        #   rsync -a --links --chmod=ugo+w ${finalAttrs.bunNodeModules}/node_modules/ src-quasar/node_modules/
        #   patchShebangs src-quasar/node_modules
        # '';

        buildInputs = lib.optionals isWindowsGnu [
          winPkgs.buildPackages.gcc
          winPkgs.windows.mingw_w64
          winPkgs.windows.mcfgthreads
          winPkgs.windows.pthreads
        ];

        preBuild = ''
          export PATH="${finalAttrs.bunNodeModules}/bin:${pkgs.bun}/bin:$PATH"

          export HOME=$(mktemp -d)
        '' + lib.optionalString isWindowsGnu ''
          export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER="${winPkgs.buildPackages.gcc}/bin/x86_64-w64-mingw32-gcc"
          export PATH="${winPkgs.buildPackages.gcc}/bin:$PATH"
          export PKG_CONFIG_ALLOW_CROSS=1

          # For crates that compile C code (via cc-rs)
          export CC_x86_64_pc_windows_gnu="$CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER"
          export CXX_x86_64_pc_windows_gnu="${winPkgs.buildPackages.gcc}/bin/x86_64-w64-mingw32-g++"
          export AR_x86_64_pc_windows_gnu="${winPkgs.buildPackages.gcc}/bin/x86_64-w64-mingw32-ar"
        '';

        # Use Tauri build hook explicitly
        # buildPhase = ''
        #   runHook preBuild

        #   # mkdir -p .cargo
        #   # cp ''${cargoConfig} .cargo/config.toml

        #   tauriBuildHook
        #   runHook postBuild
        # '';
        # Explicit cargo/tauri invocation with the desired target
        buildPhase = let
          #--config '{ "build": { "beforeBuildCommand": "", "beforeDevCommand": "" } }' ''
          adHocTauriConfig = pkgs.writeTextFile {
            name = "tauri.conf.json";
            text = builtins.toJSON {
              build = {
                beforeBuildCommand = "";
                beforeDevCommand = "";
              };
            };
          };
        in ''
          runHook preBuild

          ${lib.optionalString (isWindowsGnu || isWindowsMsvc) ''
            ./src-tauri/scripts/build/unix/beforeBuildCommand.sh

            rm ./src-tauri/tauri.windows.conf.json
          ''}

          cargoBuildType="''${cargoBuildType:-release}"
          export "CARGO_PROFILE_''${cargoBuildType@U}_STRIP"=false

          # Keep outputs outside subdir; Tauri respects CLI args better than env here
          CARGO_TARGET_DIR="$(pwd)/target"
          export CARGO_TARGET_DIR

          pushd src-tauri

          TAURI_FLAGS=( --no-bundle --target ${rustTarget} )
          ${lib.optionalString isWindowsMsvc
          "TAURI_FLAGS+=( --runner cargo-xwin )"}

          CARGO_FLAGS=( -j ''${NIX_BUILD_CORES} --offline --profile "''${cargoBuildType}" --target ${rustTarget} )

          echo "tauri build flags: ''${TAURI_FLAGS[*]}"
          echo "cargo flags: ''${CARGO_FLAGS[*]}"

          ${lib.getExe rustToolchain} --version || true
          cargo tauri build "''${TAURI_FLAGS[@]}" -- "''${CARGO_FLAGS[@]}"

          popd

          runHook postBuild
        '';

        installPhase = let
          exeSuffix = lib.optionalString (isWindowsGnu || isWindowsMsvc) ".exe";
        in ''
          runHook preInstall

          mkdir -p $out/bin

          # Copy the built binary, with .exe suffix when targeting Windows
          cp target/${rustTarget}/release/dirtywave-updater${exeSuffix} $out/bin/

          mkdir -p $out/share/build

          cp -r src-tauri $out/share/build/

          if [ -d src-quasar/dist ]; then
            cp -r src-quasar/dist $out/share/build/src-quasar/
          fi

          ${lib.optionalString isWindowsMsvc ''
            mkdir -p $out/dist

            if [ -d target/${rustTarget}/release/bundle/nsis ] && \
              [ "$(ls -A target/${rustTarget}/release/bundle/nsis)" ]; then
              cp -r target/${rustTarget}/release/bundle/nsis/* $out/dist/
            fi
          ''}

          runHook postInstall
        '';

        cargoHash =
          "sha256-ElwZcYpR6QxGUbteCDGc9iT6gJ8UJ2ffC7tEdt8OQd4="; # sha256-P+WcPc+ljG/oLT9+pU48zEpuRtPOvkChIn9EAvho7Rk=";

        bunNodeModules =
          inputs.bun2nix.lib."${pkgs.stdenv.system}".mkBunNodeModules {
            packages = import ./src-quasar/bun.nix;
          };

        # nativeBuildInputs = [
        #   pkgs.bun
        #   pkgs.cargo-tauri.hook
        #   pkgs.makeWrapper
        #   # pkgs.nodejs
        #   pkgs.pkg-config
        #   pkgs.rsync
        # ] ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux
        #   [ pkgs.wrapGAppsHook4 ];

        # buildInputs = lib.optionals pkgs.stdenv.hostPlatform.isLinux [
        #   pkgs.glib-networking
        #   pkgs.openssl
        #   pkgs.webkitgtk_4_1
        # ];

        cargoRoot = "src-tauri";

        buildAndTestSubdir = finalAttrs.cargoRoot;
      });

    bundleForTarget = { rustTarget, stdenv, ... }:
      buildDrv:
      let
        isWindowsGnu = rustTarget == "x86_64-pc-windows-gnu";
        isWindowsMsvc = rustTarget == "x86_64-pc-windows-msvc";
        isDarwin = stdenv.hostPlatform.isDarwin;

        # Dummy minisign keypair for pure builds (do not use for production)
        # These are plain strings checked into the store; safe only for dummy use.
        # pubkey format is the full minisign public key line (base64), private key is the full minisign secret key file content.
        dummyUpdaterSecrets = {
          publicKey =
            "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEI3MDYyQzU3MzI3Mjc4OEYKUldTUGVISXlWeXdHdC8zajRaa2QvWHZ1elpIZTVrOU1LUGNlMDVRZDVBQlhkd0Z4TDNpc1pjdkoK";

          privateKey =
            "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5ekZuOVEvYmlVc2FScmthOVFVVmhDRWN0NE9BOG83ZWYvY1F1djlpeTdKOEFBQkFBQUFBQUFBQUFBQUlBQUFBQWc4Y3hObUFNZEpjT3o3OStWaWZhVXFGalVscGxYVm43RlU3cW1FanpJMWtMSElFWWxRUlBydVV0T2VWYmJWVllDakJHRUZxUzl3VHpjOG45RDQ3U1hWRkNLNlpHNTZBZDROWVV5RFZtQTAzdkJuZUNodVk4Z3JHSEU4emRBNzI5cDl4OXA3ZGhwSGs9Cg==";

          password = "";
        };
        # if isWindowsGnu && isDarwin then
        # # Skip bundling Windows on macOS, just copy the exe + resources
        #   pkgs.runCommand "dirtywave-updater-bundle-skip" { } ''
        #     echo "Skipping Windows bundling on macOS; producing exe + resources only."
        #     mkdir -p $out
        #     cp -r ${buildDrv}/bin $out/
        #     cp -r ${buildDrv}/share $out/
        #   ''
        # else
      in pkgs.stdenv.mkDerivation {
        pname = "dirtywave-updater-bundle";
        version = application-version;
        inherit stdenv;
        src = buildDrv;

        nativeBuildInputs = [ pkgs.cargo pkgs.rustc pkgs.cargo-tauri pkgs.nsis ]
          ++ lib.optionals stdenv.hostPlatform.isDarwin [
            (pkgs.writeShellApplication {
              name = "codesign";
              text = ''
                echo "Skipping codesign (pure build)"
                exit 0
              '';
            })
            pkgs.darwin.xattr
          ];

        # cp -r $src/share/build/* .
        buildPhase = ''
          mkdir -p .bin
          ln -s ${pkgs.nsis}/bin/makensis .bin/makensis.exe
          export PATH=$PWD/.bin:$PATH

          cp -r $src/share/build/* .

          chmod -R u+w .

          rm -rf src-tauri/target

          mkdir -p src-tauri/target/${rustTarget}/release
          mkdir -p src-tauri/target/release

          # if [[ "${rustTarget}" = x86_64-pc-windows-* ]]; then
          #   cp $src/bin/dirtywave-updater.exe src-tauri/target/${rustTarget}/release/
          #   cp $src/bin/dirtywave-updater.exe src-tauri/target/release/
          #   cp $src/bin/dirtywave-updater.exe src-tauri/target/release/dirtywave-updater
          # else
          #   cp $src/bin/dirtywave-updater src-tauri/target/${rustTarget}/release/
          #   cp $src/bin/dirtywave-updater src-tauri/target/release/
          # fi

          if [[ "${rustTarget}" = x86_64-pc-windows-* ]]; then
            cp $src/bin/dirtywave-updater.exe src-tauri/target/${rustTarget}/release/
          else
            cp $src/bin/dirtywave-updater src-tauri/target/${rustTarget}/release/
          fi

          # Export dummy updater signing secrets to satisfy Tauri updater plugin.
          # We sign For Real™ in a later step of the process.
          export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${dummyUpdaterSecrets.password}"
          export TAURI_SIGNING_PRIVATE_KEY="${dummyUpdaterSecrets.privateKey}"

          cargo-tauri bundle \
            --config '{ "bundle": { "useLocalToolsDir": true }, "plugins": { "updater": { "pubkey": "${dummyUpdaterSecrets.publicKey}" } } }' \
            --target ${rustTarget} \
            ${
              lib.optionalString ((rustTarget == "aarch64-apple-darwin")
                || (rustTarget == "x86_64-apple-darwin")) "--bundles app \\"
            }
            ${
              lib.optionalString (isWindowsGnu || isWindowsMsvc)
              "--bundles nsis"
            } 
        '';

        installPhase = ''
          mkdir -p $out
          if [ -d "src-tauri/target/${rustTarget}/release/bundle" ]; then
            cp -r src-tauri/target/${rustTarget}/release/bundle/* $out/
          else
            echo "Bundle directory not found!"
            find target -name "bundle" -type d || echo "No bundle directories found"
            exit 1
          fi
        '';
      };

    # # Bundle derivation (pure, with dummy updater keys)
    # bundleForTarget = let

    #   # Dummy minisign keypair for pure builds (do not use for production)
    #   # These are plain strings checked into the store; safe only for dummy use.
    #   # pubkey format is the full minisign public key line (base64), private key is the full minisign secret key file content.
    #   dummyUpdaterSecrets = {
    #     publicKey =
    #       "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEI3MDYyQzU3MzI3Mjc4OEYKUldTUGVISXlWeXdHdC8zajRaa2QvWHZ1elpIZTVrOU1LUGNlMDVRZDVBQlhkd0Z4TDNpc1pjdkoK";

    #     privateKey =
    #       "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5ekZuOVEvYmlVc2FScmthOVFVVmhDRWN0NE9BOG83ZWYvY1F1djlpeTdKOEFBQkFBQUFBQUFBQUFBQUlBQUFBQWc4Y3hObUFNZEpjT3o3OStWaWZhVXFGalVscGxYVm43RlU3cW1FanpJMWtMSElFWWxRUlBydVV0T2VWYmJWVllDakJHRUZxUzl3VHpjOG45RDQ3U1hWRkNLNlpHNTZBZDROWVV5RFZtQTAzdkJuZUNodVk4Z3JHSEU4emRBNzI5cDl4OXA3ZGhwSGs9Cg==";

    #     password = "";
    #   };
    # in { rustTarget, system }:
    # buildDrv:
    # pkgs.stdenv.mkDerivation {
    #   pname = "dirtywave-updater-bundle";
    #   version = "0.1.0";
    #   system = system;

    #   src = buildDrv; # config.outputs.build.${system};

    #   nativeBuildInputs = [ pkgs.cargo pkgs.rustc pkgs.cargo-tauri ]
    #     ++ lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
    #       # No-op codesign during pure builds
    #       (pkgs.writeShellApplication {
    #         name = "codesign";
    #         text = ''
    #           echo "Skipping codesign (pure build)"
    #           exit 0
    #         '';
    #       })
    #       pkgs.darwin.xattr
    #     ];

    #   buildPhase = ''
    #     cp -r $src/share/build/* .
    #     chmod -R u+w .

    #     mkdir -p src-tauri/target/${rustTarget}/release
    #     cp $src/bin/dirtywave-updater src-tauri/target/${rustTarget}/release/

    #       # Export dummy updater signing secrets to satisfy Tauri updater plugin.
    #       # We sign For Real™ in a later step of the process.
    #       export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${dummyUpdaterSecrets.password}"
    #       export TAURI_SIGNING_PRIVATE_KEY="${dummyUpdaterSecrets.privateKey}"

    #     cargo-tauri bundle \
    #       --bundles app \
    #       --target ${rustTarget} \
    #       --config '{ "plugins": { "updater": { "pubkey": "${dummyUpdaterSecrets.publicKey}" } } }'
    #   '';

    #   installPhase = ''
    #     mkdir -p $out

    #     # Copy the bundled application to output
    #     if [ -d "src-tauri/target/${rustTarget}/release/bundle" ]; then
    #       cp -r src-tauri/target/${rustTarget}/release/bundle/* $out/
    #     else
    #       echo "Bundle directory not found!"
    #       find target -name "bundle" -type d || echo "No bundle directories found"
    #       exit 1
    #     fi
    #   '';

    #   meta = {
    #     description = "Bundled Dirtywave Updater application";
    #     platforms = lib.platforms.darwin ++ lib.platforms.linux;
    #   };
    # };
  in {
    # stdenv.hostPlatform.rust.rustcTarget -> "aarch64-apple-darwin"
    # To choose a different target by name, define stdenv.hostPlatform.rust.rustcTarget
    # as that name (a string), and that name will be used instead.
    #
    # To pass a completely custom target, define stdenv.hostPlatform.rust.rustcTarget
    # with its name, and stdenv.hostPlatform.rust.platform with the value.
    # The value will be serialized to JSON in a file called
    # ${stdenv.hostPlatform.rust.rustcTarget}.json, and the path of that file will be used instead.
    dirtywave-updater = {
      build = pkgs.lib.mapAttrs
        (name: target: assert validateTarget name target; buildForTarget target)
        targets;

      bundle = pkgs.lib.mapAttrs (name: target:
        let build = config.outputs.dirtywave-updater.build.${name};
        in assert validateTarget name target; bundleForTarget target build)
        targets;
    };
  };

  packages = [
    inputs.bun2nix.packages."${pkgs.stdenv.system}".default
    pkgs.age
    pkgs.cargo-tauri
    pkgs.jq
  ];

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

    "build_aarch64".exec = ''
      sops exec-env ./encrypted/tauri-updater.sops.json 'tauri-cli build --target aarch64-apple-darwin'
    '';

    frontend.exec = ''
      (cd ${config.env.QUASAR_ROOT} && exec "$@")
    '';

    prepare-release.exec = ''
      set -euo pipefail

      if [ $# -ne 2 ]; then
        echo "Usage: $0 <version> <out-dir>"
        exit 1
      fi

      VERSION="$1"
      OUT_DIR="$2"
      PUB_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

      # Find the most recent tag (if any)
      LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

      if [ -n "$LAST_TAG" ]; then
        NOTES=$(git log --pretty=format:"%s" "$LAST_TAG"..HEAD | sed ':a;N;$!ba;s/\n/\\n/g')
      else
        NOTES="Initial release"
      fi

      # Create a new git tag for this version if it doesn't exist yet
      if ! git rev-parse "$VERSION" >/dev/null 2>&1; then
        git tag -a "$VERSION" -m "Release $VERSION"
      fi

      # Read the signature from the build output
      SIG_FILE="$OUT_DIR/macos/Dirtywave Updater.app.tar.gz.sig"
      if [ ! -f "$SIG_FILE" ]; then
        echo "Signature file not found: $SIG_FILE" >&2
        exit 1
      fi
      SIGNATURE=$(tr -d '\n' < "$SIG_FILE")

      URL="https://github.com/euphemism/dirtywave-updater-releases-mirror/releases/download/''${VERSION}/Dirtywave.Updater_aarch64.app.tar.gz"

      cat > latest.json <<EOF
      {
        "version": "''${VERSION}",
        "notes": "''${NOTES}",
        "pub_date": "''${PUB_DATE}",
        "platforms": {
          "darwin-aarch64": {
            "signature": "''${SIGNATURE}",
            "url": "''${URL}"
          }
        }
      }
      EOF

      echo "Generated latest.json for ''${VERSION}"
    '';

    quasar-cli.exec = ''frontend bunx @quasar/cli "$@"'';

    set-and-sync-package-versions = {
      exec = ''
        set -euo pipefail

        if [ $# -ne 1 ]; then
          echo "Usage: $0 {patch|minor|major}"
          exit 1
        fi

        BUMP_TYPE="$1"

        echo "BUMP_TYPE is $BUMP_TYPE"

        # Extract current version from devenv.nix
        CURRENT=$(sed -nE 's/^[[:space:]]*application-version = "0.2.1";$/\1/p' devenv.nix)

        if [ -z "$CURRENT" ]; then
          echo "Could not determine current version from devenv.nix"
          exit 1
        fi

        # Compute new version using semver-tool
        NEW=$(semver bump "$BUMP_TYPE" "$CURRENT")

        echo "Bumping version: $CURRENT → $NEW"

        # Update devenv.nix
        sed -i -E "s|(application-version = \").*(\";)|\\1''${NEW}\\2|" devenv.nix

        # Update Cargo.toml
        sed -i -E "s|^version = \".*\"|version = \"''${NEW}\"|" "${config.env.TAURI_ROOT}/Cargo.toml"

        # Update package.json
        sed -i -E "s|\"version\": *\"[^\"]*\"|\"version\": \"''${NEW}\"|" "${config.env.QUASAR_ROOT}/package.json"

        echo "Updated all version references to ''${NEW}"

        echo "''${NEW}"
      '';

      packages = [ pkgs.semver-tool ];
    };

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

    tauri-cli.exec = ''backend cargo-tauri "$@"'';
  };

  tasks = {
    "dirtywave-updater:bootstrap:git-config-sopsdiffer" = {
      before = [ "devenv:enterShell" ];

      exec = ''git config --local diff.sopsdiffer.textconv "sops decrypt"'';

      status = ''
        [ "$(git config --local diff.sopsdiffer.textconv)" = "sops decrypt" ] && exit 0 || exit 1
      '';
    };

    # "dirtywave-updater:set-and-sync-package-versions" = {
    #   before = [ "devenv:enterShell" ];

    #   exec = config.scripts.set-and-sync-package-versions.exec;
    # };
  };

  # See full reference at https://devenv.sh/reference/options/
}
