forth-elf
=========

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
    type Π Π : c
     o : x
     o : y
    x y b Π Π : q
    k k q k c : d
```
The three magic operations are:

- `type`: push `type` onto the stack

- `:`: assert the stack has one element, and pop it, and call it `A`.
   Read the next token from the stream without interpreting it and call it `N`.
   Install `N : A` in the signature.

- `Π`: assert the stack has one element, and pop it, and call it `B`.
   Pop the most recently added declaration `x : A` in the signature.
   Push (some representation of) `Πx:A.B` onto the stack.

Type Checking Functions
-----------------------

Every time I install a type family or term constant into the signature,
there is implicitly
- a type-checking function that goes along with it.
The local argument types inside the Π-chain of a constant's arguments each have:
- a substitution function that goes along with it

Maybe the substitution functions only get created by Π? They make sense
for types that have local contexts.

Running the constant c should take a term stack
[kkq : kkb, k : o]
and produce
[kkqkc : type]
So what might the implementation of this look like?

Imagine some instructions like:

- `{` : allocate a context Γ for processing
- `→` :
    - pop (M:A) (A':type) off of stack
    - require A = A'
    - push M onto current Γ
- `!n`: copy debruijn n of Γ to stack
- `}(c)` :
    - pop (A : type/kind) off stack,
    - concatenate all terms in current Γ with c, consuming Γ in the process
    - push (Γc : A)
- `type`: push (type : kind)

"Compilation" yields:
```
o ⇒ { type }(o)
k ⇒ { o }(k)
b ⇒ { o → o → type }(b)
c ⇒ { o → !1 !1 b → type }(c)
q ⇒ { o → o → !1 !2 b }(q)
d ⇒ { k k q k c }(d)
```

Markers
-------
What if instead of counting Πs I just have a delimiter I'm scanning back to?
Also suppose:
 → actually performs the signature append
 : just does naming

```
    { type } o
    { o } k
    { o → o → type } b
    { o : a → a a b → type } c
    { o : x → o : y → x y b } q
    { k k q k c } d
```

Distinct Binders
----------------
What if instead of counting Πs I just have ";" mean "add to context"
and ":" mean "add to signature"?

```
    type : o
    o : k
    o → o → type : b
    o ; a → a a b → type : c
    o ; x → o ; y → x y b : q
    k k q k c : d
```

Lambda Syntax?
--------------

How might I represent higher-order terms? Maybe `[` does weakening (i.e. pushes a variable into the context)
and `]` effects the λR rule.
```
  a : x [ b : y [ y x k ] ]
```
would be λ(x:a)λ(y:b).k x y.
