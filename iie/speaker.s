.include "apple2.inc"

SPEAKER          = $C030

.segment "CODE"

.proc main
    lda     #0
    sta     $50

    bit     KBDSTRB
loop:
    lda     KBD
    asl
    bcc     :+

    bit     KBDSTRB
    jsr     $BF00
    .byte   $65
    .addr   * + 2
    .byte   4
    .byte   0
    .word   0000
    .byte   0
    .word   0000

:
    dec     $50
    bne     loop
    lda     SPEAKER
    jmp     loop

.endproc
