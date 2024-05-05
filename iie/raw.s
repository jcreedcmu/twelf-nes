.segment "CODE"

start:
   lda $c050
 	lda $c052
 	lda $c057
 	lda $c054
	lda #$55
	sta $2000
	lda #$2a
	sta $2001
	lda #$55
	sta $2002

   rts

;; start:
;;    lda   $c050
;; 	lda   $c052
;; 	lda	$c057
;; loop:
;; 	lda	$c054
;; 	lda	$c055
;; 	jmp	loop
