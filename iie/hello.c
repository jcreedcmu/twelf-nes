#include <apple2enh.h>
#include <conio.h>

#define PEEK(addr) (*((unsigned char *)addr))
#define POKE(addr, val) ((*((unsigned char *)addr)) = val)

void enter_hires_mode() {
  unsigned char x;

  // https://www.xtof.info/hires-graphics-apple-ii.html

  x = PEEK(0xC050); // in order to switch to the graphical display
  x = PEEK(0xC052); // to be full-screen
  x = PEEK(0xC057); // to enter HIRES mode
  x = PEEK(0xC054); // to select PAGE 1 or 0xC055 to select PAGE 2

  // write some data to hires memory
  POKE(0x2081, 0xff);
}

// implemented in asm
void init_serial(void);
void display_string(void);
void print_serial(void);
void read_cmd(void);
void read_cmd_loop(void);

void main(void) {
  unsigned char i;

  display_string();

  while (1) {
	 i = cgetc();
	 if (i == 'I') {
		init_serial();
		cputs("Ok, initialized serial.\r\n");
	 }
	 else if (i == 'R') {
		cputs("read/write register: ");
		i = PEEK(0xC0A8);
		cputhex8(i);
		cputs("\r\n");
	 }
	 else if (i == 'S') {
		cputs("status byte: ");
		cputhex8(PEEK(0xC0A9));
		cputs("\r\n");
	 }
	 else if (i == 'P') {
		print_serial();
	 }
	 else if (i == 'C') {
		read_cmd();
	 }
	 else if (i == 'L') {
		read_cmd_loop();
	 }
	 else if (i == 'D') {
		cputs("debugging byte: ");
		cputhex8(PEEK(0x0070));
	 }
	 else
		cputc(i);
  }
}
