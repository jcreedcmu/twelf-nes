hello.bin:
	cl65 -t apple2 hello.c -o hello.bin

AC=/home/jcreed/pgit/AppleCommander/AppleCommander-ac-1.9.0.jar
TARGET=$(shell cl65 --print-target-path)

.PHONY: hello.dsk
hello.dsk:
	cp ProDOS_2_4_3.po hello.dsk
	java -jar $(AC) -p hello.dsk hello.system sys < $(TARGET)/apple2/util/loader.system
	java -jar $(AC) -as hello.dsk hello bin < hello.bin
