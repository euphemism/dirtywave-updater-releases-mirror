{ config, inputs, lib, pkgs, ... }:

let
  pkgs-unstable = import inputs.nixpkgs-unstable {
    overlays = [ inputs.rust-overlay.overlays.default ];
    system = pkgs.stdenv.system;
  };
in {
  outputs = let
    validateTarget = name: target:
      let
        required = [ "rustTarget" "stdenv" ];
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

    targets = {
      # macos = mkTarget "aarch64-darwin" { };
      macos = {
        rustTarget = "aarch64-apple-darwin";
        stdenv = pkgs.stdenv;
      };
      windows = {
        rustTarget = "x86_64-pc-windows-msvc";
        stdenv = pkgs.stdenv; 
      };

      # windows = {
      #   rustTarget = "x86_64-pc-windows-gnu";
      #   stdenv = pkgs.pkgsCross.mingwW64.stdenv;
      # };

      linux = mkTarget "x86_64-linux" { };
    };

    buildForTarget = { rustTarget, stdenv, ... }:
      let
        isWindowsGnu = rustTarget == "x86_64-pc-windows-gnu";
        isWindowsMsvc = rustTarget == "x86_64-pc-windows-msvc";

        rustToolchain = pkgs-unstable.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" ];
          targets = [ rustTarget ];
        };

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
          pkgs.makeWrapper
          pkgs.pkg-config
        ] ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux
          [ pkgs.wrapGAppsHook4 ] ++ lib.optionals isWindowsMsvc [
            pkgs.cargo-xwin
            pkgs.lld
            pkgs.nsis
          ];
      in rustPlatform.buildRustPackage (finalAttrs: {
        inherit stdenv;
        inherit nativeBuildInputs;

        pname = "dirtywave-updater";
        version = "0.2.0";
        src = lib.cleanSource ./.;

        doCheck = false;
        dontTauriInstall = true;

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

        buildInputs = lib.optionals isWindowsGnu [
          winPkgs.buildPackages.gcc
          winPkgs.windows.mingw_w64
          winPkgs.windows.mcfgthreads
          winPkgs.windows.pthreads
        ];

        preBuild = ''
          export PATH="${finalAttrs.bunNodeModules}/bin:${pkgs.bun}/bin:$PATH"
          export QUASAR_CLI_UPDATE_CHECK=false
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

        buildPhase = ''
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

          TAURI_FLAGS=(
            --no-bundle
            --target ${rustTarget} ${
              lib.optionalString isWindowsMsvc "--runner cargo-xwin"
            } )

          CARGO_FLAGS=( -j ''${NIX_BUILD_CORES} --offline --profile "''${cargoBuildType}" --target ${rustTarget} )

          echo "tauri build flags: ''${TAURI_FLAGS[*]}"
          echo "cargo flags: ''${CARGO_FLAGS[*]}"

          ${lib.getExe rustToolchain} --version || true
          cargo tauri build "''${TAURI_FLAGS[@]}" -- "''${CARGO_FLAGS[@]}"

          popd

          runHook postBuild
        '';

        installPhase = let exeSuffix = lib.optionalString isWindowsGnu ".exe";
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

            cp -r target/${rustTarget}/release/bundle/nsis/* $out/dist/
          ''}

          runHook postInstall
        '';

        cargoHash = "sha256-ElwZcYpR6QxGUbteCDGc9iT6gJ8UJ2ffC7tEdt8OQd4=";

        bunNodeModules =
          inputs.bun2nix.lib."${pkgs.stdenv.system}".mkBunNodeModules {
            packages = import ./src-quasar/bun.nix;
          };

        cargoRoot = "src-tauri";

        buildAndTestSubdir = finalAttrs.cargoRoot;
      });
  in {
    dirtywave-updater = {
      build = pkgs.lib.mapAttrs
        (name: target: assert validateTarget name target; buildForTarget target)
        targets;
    };
  };
}
