{ config, pkgs, lib, ... }:

{
  languages.rust = {
    enable = true;
    # https://devenv.sh/reference/options/#languagesrustchannel
    channel = "nightly";

    targets = [ "aarch64-apple-darwin" "wasm32-unknown-unknown" ];

    components =
      [ "rustc" "cargo" "clippy" "rustfmt" "rust-analyzer" "rust-std" ];
  };

  git-hooks = {
    hooks = {
      clippy = {
        enable = true;
        settings.offline = lib.mkDefault false;
        extraPackages = [ pkgs.openssl ];
      };

      commitizen.enable = true;

      rustfmt.enable = true;
    };

    settings.rust.cargoManifestPath = "${config.env.DEVENV_ROOT}/Cargo.toml";
  };

  packages = [
    pkgs.binaryen # use a newer version of wasm-opt
    pkgs.nodejs
    pkgs.wasm-pack
  ] ++ lib.optionals pkgs.stdenv.isDarwin (with pkgs.darwin.apple_sdk;
    [ frameworks.Security ]); # TODO: Look into why this is needed

  # See full reference at https://devenv.sh/reference/options/
}
