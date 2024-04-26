Twelf NES
=========

Taking some notes on what might be possible for an "implementation" of
"Twelf" on NES. I'm imagining some kind of very primitive typechecker
might fit in a cartridge.

Input Possibilities
-------------------

### Family BASIC

The "[Family BASIC
Keyboard](https://www.nesdev.org/wiki/Family_BASIC_Keyboard)" was an
extension-port peripheral for the famicom. There's a [sort of
successfully emulatable
ROM](https://www.retrostic.com/roms/nes/family-basic-1937/download) of
"Family BASIC", but I can't get the shift key to work. I don't know if
this is a problem with the rom, with fceux, or what. Looking at [fceux
source](https://github.com/TASEmulators/fceux/blob/master/src/drivers/Qt/input.cpp#L1929)
it definitely looks like they're aware of some shift-key related hacks
for family basic in particular.

On the topic of Family BASIC:
- [English-language faq](https://gamefaqs.gamespot.com/nes/938747-family-basic-v3/faqs/59317)
- [Japanese-language manual](https://archive.org/details/family-basic-v2-1-manual-600dpi-ozidual/Family%20Basic%20v2.1%20Manual/page/n51/mode/2up)
- [discussion of dissassembly of the ROM](https://forums.nesdev.org/viewtopic.php?t=13237)

### Arduino

One might imagine trying to hook up a modern usb keyboard through an
arduino or something which then makes some magic pattern of button
presses to transmit bytes through the western NES controller ports.

General NES dev notes
---------------------
- [nesdoug](https://nesdoug.com/) has some examples [starting here](https://github.com/nesdoug/01_Hello) that compiled and emulated fine with little effort for me
 - I used `nix-shell -p cc65` and edited the makefiles to replace relative paths to binaries with simply binary names so they were found in `PATH`.
