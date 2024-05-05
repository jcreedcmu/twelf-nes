.segment "CODE"

prhex = $fdda ;; print accumulator as hex
crout = $fd8e ;; print carriage return
text_mode = $c051

;; According to http://www.applelogic.org/files/AIIETECHREF2.pdf
;; page 82 (pdf page 12) Table 4-6
;; we can read from this to ensure that we're reading from ROM
;; in the range that contains system monitor routines.
rom_switch = $c08a

start:
	lda rom_switch
   lda text_mode
   lda #$cd
   jsr prhex
   jsr crout
	rts


   ;; lda $c051
	;; lda #$ab
   ;; jsr prhex
   ;; jsr crout
   ;; rts

;; start:
;;    lda   $c050
;; 	lda   $c052
;; 	lda	$c057
;; loop:
;; 	lda	$c054
;; 	lda	$c055
;; 	jmp	loop
