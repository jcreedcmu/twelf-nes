AC=/home/jcreed/pgit/AppleCommander/AppleCommander-ac-1.9.0.jar
TARGET=$(shell cl65 --print-target-path)

hello.dsk: hello.bin
	cp ProDOS_2_4_3.po hello.dsk
	java -jar $(AC) -p hello.dsk hello.system sys < $(TARGET)/apple2/util/loader.system
	java -jar $(AC) -as hello.dsk hello bin < hello.bin

hello.bin: hello.c display_string.s
	cl65 -t apple2enh display_string.s hello.c -o hello.bin
