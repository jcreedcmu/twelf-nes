AC=/home/jcreed/pgit/AppleCommander/AppleCommander-ac-1.9.0.jar
TARGET=$(shell cl65 --print-target-path)

hello.dsk: hello.bin
	cp ProDOS_2_4_3.po hello.dsk
	java -jar $(AC) -p hello.dsk hello.system sys < $(TARGET)/apple2/util/loader.system
	java -jar $(AC) -as hello.dsk hello bin < hello.bin

hello.bin: hello.c display_string.s
	cl65 -t apple2enh display_string.s hello.c -o hello.bin

adt:
	sh ~/pgit/adtpro/ADTPro-2.1.0/adtpro.sh

stty:
	stty -F /dev/ttyUSB0 9600 cs8 cstopb -parenb -icanon -istrip -ctlecho

twelf-a2e.pgm:
	convert -compress none twelf-a2e.png twelf-a2e.pgm

# Speaker code from
# https://github.com/cc65/wiki/wiki/Apple-II-4.-Compiling-assembly-code-for-the-Apple-II

speaker.bin: speaker.s
	cl65 -t apple2 -u __EXEHDR__ speaker.s apple2.lib -o speaker.bin -C apple2-asm.cfg

speaker.dsk: speaker.bin
	cp ProDOS_2_4_3.po speaker.dsk
	java -jar $(AC) -p speaker.dsk speaker.system sys < $(TARGET)/apple2/util/loader.system
	java -jar $(AC) -as speaker.dsk speaker bin < speaker.bin

# Can run the above with wine like
# wine AppleWin.exe -d1 "Z:\\home\\jcreed\\proj\\twelf-nes\\iie\\speaker.dsk"

# This target assembles some source into a raw binary suitable for
# splatting into memory over serial at address 0x6000
raw.bin: raw.s
	cl65 -t apple2 raw.s  -o raw.bin -C apple2-asm.cfg --start-addr 0x6000
