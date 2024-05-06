forth-elf
---------

In order to get anything remotely resembling dependent type-checking
on very resource-constrained hardware, I think it is a good idea to
try to think with a forth-like mindset. Which is to say, have a small
vocabulary of highly reusable imperative operations on some
conveniently structured state.

I'm ok with --- for now --- limiting myself to the fragment of
first-order dependent types with only Π. So something like
```
	 o : type.
	 k : o.
	 b : o → o → type.
	 c : {a : o} b a a → type.
	 q : {x : o} {y : o} b x y.
	 d : c k (q k k).
```

is fair game, but the representation of this may be quite different.
I'm imagining that the way the user expresses complex Π-types and
-kinds is by first adding constants to the signature, and then
"grabbing" them with Π-quantifiers. This has the advantage that
whatever machinery is used to check that symbols from the *signature*
are used correctly can be reused to check that symbols from the
*context* are used correctly: because we do not even really
distinguish between the two.

A possible imagined version of the actual thing the user types in to obtain
the above signature is:
```
    type : o
    o : k
     o : _
     o : _
    type Π Π : b
     o : a
     a a b : _
    type : c
     o : x
     o : y
    x y b Π Π : q
    k k k q c : d
```
The three magic operations are:

- `type`: push `type` onto the stack

- `:`: assert the stack has one element, and pop it, and call it `A`.
   Read the next token from the stream without interpreting it and call it `N`.
   Install `N : A` in the signature.

- `Π`: assert the stack has one element, and pop it, and call it `B`.
   Pop the most recently added declaration `x : A` in the signature.
   Push (some representation of) `Πx:A.B` onto the stack.
