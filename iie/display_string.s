	.setcpu		"6502"
	.case			on
	.import		_cputs
	.import		_cputhex8
	.export		_display_string
	.export		_init_serial
	.export		_print_serial

slot					= $20
serial_ctl1 	 	= $C08A+slot
serial_ctl2 	 	= $C08B+slot
serial_data			= $C088+slot  ; Both data read and data write
serial_status		= $C089+slot

.segment	"RODATA"

msg:
	.byte	"Hello from asm!"
crnl:
   .byte 13, 10, 0

.segment	"CODE"

.proc	_display_string: near
	lda     #<(msg)
	ldx     #>(msg)
	jsr     _cputs
	rts
.endproc

	;; returns serial byte in A
fetch_serial:
	lda #$08 						  ; receive register full?
	bit serial_status
	beq fetch_serial
	lda serial_data
	rts

.proc	_init_serial: near

   ;; DTR/DSR state change still producing interrupts when dip switch
	;; is on and ProDOS doesn't like this if we haven't installed a
	;; signal handler. We're going to be doing all serial communication
	;; synchronously so just disable interrupts.
	sei

	lda #$0b
	sta serial_ctl1
	lda #$9e
	sta serial_ctl2
   rts

.endproc

.proc _print_serial: near
	jsr fetch_serial
	jsr _cputhex8
	lda #<(crnl)
	ldx #>(crnl)
	jsr _cputs
   rts
.endproc
