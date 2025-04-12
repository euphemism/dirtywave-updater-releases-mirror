{ pkgs, ... }:

{
  # imports = [ ./builds ];

  outputs = {
    updater = { aarch64 = import ./builds/aarch64.nix { inherit pkgs; }; };
  };
}
