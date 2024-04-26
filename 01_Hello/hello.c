/*	simple Hello World, for cc65, for NES
 *  writing to the screen with rendering disabled
 *	using neslib
 *	Doug Fraker 2018
 */



#include "LIB/neslib.h"
#include "LIB/nesdoug.h"

#define BLACK 0x0f
#define DK_GY 0x1b
#define LT_GY 0x3a
#define WHITE 0x30
// there's some oddities in the palette code, black must be 0x0f, white must be 0x30



#pragma bss-name(push, "ZEROPAGE")

// GLOBAL VARIABLES
// all variables should be global for speed
// zeropage global is even faster

#define uc unsigned char

uc x, y;
uc c;


const uc text[]="Hello World!"; // zero terminated c string

const uc palette[]={
BLACK, DK_GY, LT_GY, WHITE,
0,0,0,0,
0,0,0,0,
0,0,0,0
};

void main (void) {

	ppu_off(); // screen off

	pal_bg(palette); //	load the BG palette

	// set a starting point on the screen
	// vram_adr(NTADR_A(x,y));
	//vram_adr(NTADR_A(3,3)); // screen is 32 x 30 tiles

	x = 0;
	y = 0;
	c = 0;

  	for(; y < 16; ++y) {
	  vram_adr(NTADR_A(8,y+5));
	  //	vram_put('H');
	   for(x = 0; x < 16; ++x) {
	   	 vram_put(c);
	   	 ++c;
	   }
	}

	// vram_adr and vram_put only work with screen off
	// NOTE, you could replace everything between i = 0; and here with...
	// vram_write(text,sizeof(text));
	// does the same thing

	ppu_on_all(); //	turn on screen


	while (1){
		// infinite loop
		// game code can go here later.

	}
}
