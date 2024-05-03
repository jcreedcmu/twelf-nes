	.setcpu		"6502"
	.case			on
	.import		_cputs
	.import		_cputhex8
	.export		_init_serial
	.export		_read_cmd_loop

slot					= $20
serial_ctl1 	 	= $C08A+slot
serial_ctl2 	 	= $C08B+slot
serial_data			= $C088+slot  ; Both data read and data write
serial_status		= $C089+slot

scratch = $60
cmd_addr1 = scratch+0
cmd_addr2 = scratch+1
loop_continue = scratch+3

; .segment	"RODATA"

.segment	"CODE"

	;; returns serial byte in A
.proc fetch_serial_ack: near
loop:
	lda #$08 						  ; receive register full?
	bit serial_status
	beq loop
	lda serial_data
	tax
	lda #$ac							  ; "ack"
	sta serial_data
	txa
	rts
.endproc

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

.proc _read_cmd_loop: near
   lda #$1
   sta loop_continue
loop:
	jsr fetch_serial_ack
	sta cmd_addr1
	jsr fetch_serial_ack
	sta cmd_addr2
	jsr fetch_serial_ack
	ldy #0
	sta (cmd_addr1),y
	lda loop_continue
   bne loop
	jmp $6000
   rts
.endproc
