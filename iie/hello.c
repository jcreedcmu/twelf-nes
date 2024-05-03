#include <apple2enh.h>
#include <conio.h>

// implemented in asm
void init_serial(void);
void read_cmd_loop(void);

void main(void) {
  init_serial();
  cputs("Initialized serial.\r\n");
  read_cmd_loop();
}
