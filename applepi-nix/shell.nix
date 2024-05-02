{ pkgs ? import <nixpkgs> {} }:
  pkgs.mkShell {
    buildInputs = [
                    pkgs.qt5.full
                    pkgs.qt5.qtgamepad
                    pkgs.qtcreator
                  ];
}
