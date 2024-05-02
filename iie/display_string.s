	.setcpu		"6502"
	.case		on
	.import		_cputs
	.export		_display_string

dsp             = $D012         ;  PIA.B display output register

.segment	"RODATA"

msg:
	.byte	"Hello from asm!", 10, 13, 0

.segment	"CODE"

.proc	_display_string: near

	sei     							  ; I don't know why serial receive is producing interrupts?
	lda     #<(msg)
	ldx     #>(msg)
	jsr     _cputs
	rts

.endproc

.proc	_write: near

	bit dsp         ; DA bit (B7) cleared yet?
   bmi _write      ; No, wait for display.
   sta dsp         ; Output character. Sets DA.
   rts             ; Return.

.endproc
