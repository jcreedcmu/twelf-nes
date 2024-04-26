{ pkgs ? import <nixpkgs> {} }:
  with pkgs; with builtins; let
    myShellHook = ''
    '';
  in
    mkShell {
      nativeBuildInputs = [
        cc65
      ];
      shellHook = myShellHook;
}
