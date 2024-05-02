	.setcpu		"6502"
	.case		on
	.import		_cputs
	.export		_display_string


.segment	"RODATA"

msg:
	.byte	"Hello from asm!\n\r\0"

; ---------------------------------------------------------------
; void __near__ display_string (void)
; ---------------------------------------------------------------

.segment	"CODE"

.proc	_display_string: near

.segment	"CODE"

	lda     #<(msg)
	ldx     #>(msg)
	jsr     _cputs
	rts

.endproc
