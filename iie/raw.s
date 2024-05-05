.segment "CODE"

start:
   lda   $c050
	lda   $c052
	lda	$c057
loop:
	lda	$c054
	lda	$c055
	jmp	loop
