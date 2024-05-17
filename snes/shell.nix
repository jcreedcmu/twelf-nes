# The point of this is to have a shell to run ardour in
{ pkgs ? import <nixpkgs> {} }:
  with pkgs; with builtins; let
    shellHook = ''
    export ALSA_PLUGIN_DIR=${alsa-plugins}/lib/alsa-lib
    '';
  in
    mkShell {
      nativeBuildInputs = [
        snes9x
      ];
      shellHook = shellHook;
}
