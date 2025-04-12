{ pkgs, stdenv, ... }:

stdenv.mkDerivation {
  name = "dirtywave-updater-aarch64";
  src = ../../../; # Path to your Tauri project repository

  buildInputs = [  pkgs.cargo pkgs.rustc ]; # Include Rust tooling

  CARGO_TARGET_DIR = "$out"; # Redirect Cargo's build output to the Nix store

  buildPhase = ''
    export CARGO_HOME="$PWD/.cargo" # Use a local Cargo home for better isolation
    tauri-cli build --target aarch64-apple-darwin
  '';

  installPhase = ''
    mkdir -p $out/bin

    cp -R target/aarch64-apple-darwin/release/bundle $out/bundle
    
    cp $out/bundle/macos/dirtywave-updater.app $out/bin
  '';
}
