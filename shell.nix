{ pkgs ? import <nixpkgs> {} }:
  with pkgs; with builtins; let
    myShellHook = ''
    TEXINPUTS=.:/home/jcreed/dot-emacs/tex//:
    '';
  in
    mkShell {
      nativeBuildInputs = [
        cc65
        texlive.combined.scheme-medium
      ];
      shellHook = myShellHook;
}
