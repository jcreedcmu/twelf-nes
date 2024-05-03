	.setcpu		"6502"
	.case			on
	.import		_cputs
	.import		_cputhex8
	.export		_display_string
	.export		_init_serial
	.export		_print_serial
	.export		_print_serial_ack
	.export		_read_cmd
	.export		_read_cmd_loop

slot					= $20
serial_ctl1 	 	= $C08A+slot
serial_ctl2 	 	= $C08B+slot
serial_data			= $C088+slot  ; Both data read and data write
serial_status		= $C089+slot

scratch = $60
cmd_addr1 = scratch+0
cmd_addr2 = scratch+1
cmd_val = scratch+2
loop_continue = scratch+3

.segment	"RODATA"

msg:
	.byte	"Hello from asm!"
crnl:
   .byte 13, 10, 0
msg2:
	.byte	"Fetch serial ack", 13, 10, 0
msg3:
	.byte	"Three acks!", 13, 10, 0

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

fetch_serial_ack:
	lda #<(msg2)
	ldx #>(msg2)
	jsr _cputs
fetch_serial_ack_loop:
	lda #$08 						  ; receive register full?
	bit serial_status
	beq fetch_serial_ack_loop
	lda serial_data
	tax
	lda #$ac							  ; "ack"
	sta serial_data
	txa
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

.proc _print_serial_ack: near
	jsr fetch_serial_ack
	jsr _cputhex8
	lda #<(crnl)
	ldx #>(crnl)
	jsr _cputs
   rts
.endproc

.proc _read_cmd: near
	jsr fetch_serial_ack
	sta cmd_addr1
	jsr fetch_serial_ack
	sta cmd_addr2
	jsr fetch_serial_ack
   sta cmd_val
	lda #<(msg3)
	ldx #>(msg3)
	jsr _cputs
	ldy #0
   lda cmd_val
	sta (cmd_addr1),y
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
   rts
.endproc
