#include <conio.h>

#define PEEK(addr) (*((unsigned char *)addr))
#define POKE(addr, val) ((*((unsigned char *)addr)) = val)

void main(void) {
  unsigned char x;

  cputs("Hello, World!\n");
  cgetc();

  // https://www.xtof.info/hires-graphics-apple-ii.html

  x = PEEK(0xC050); // in order to switch to the graphical display
  x = PEEK(0xC052); // to be full-screen
  x = PEEK(0xC057); // to enter HIRES mode
  x = PEEK(0xC054); // to select PAGE 1 or 0xC055 to select PAGE 2
  POKE(0x2081, 0xff);
  cgetc();
}
