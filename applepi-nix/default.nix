# allow our nixpkgs import to be overridden if desired
{ pkgs ? import <nixpkgs> {} }:

# let's write an actual basic derivation
# this uses the standard nixpkgs mkDerivation function
pkgs.stdenv.mkDerivation {

  # name of our derivation
  name = "basic-derivation";

  nativeBuildInputs = [
    pkgs.qt5.full
    pkgs.qt5.qtgamepad
    pkgs.qtcreator
  ];

  # sources that will be used for our derivation.
  src = pkgs.fetchgit {
    url = "https://github.com/FZBunny/applepi";
    hash = "sha256-50W8g/5FCybtd3ocso5+s06qGhOv0TflqSaKW9GBtF8=";
  };

  # see https://nixos.org/nixpkgs/manual/#ssec-install-phase
  # $src is defined as the location of our `src` attribute above
  installPhase = ''
    # $out is an automatically generated filepath by nix,
    # but it's up to you to make it what you need. We'll create a directory at
    # that filepath, then copy our sources into it.
    mkdir $out
    cp -rv $src/* $out
  '';

  configurePhase=''
   qmake -makefile applepi.pro
  '';
}
