.segment "CODE"

prhex = $fdda

start:
   lda $c051
	lda #$ab
   jsr prhex
   rts

;; start:
;;    lda   $c050
;; 	lda   $c052
;; 	lda	$c057
;; loop:
;; 	lda	$c054
;; 	lda	$c055
;; 	jmp	loop
