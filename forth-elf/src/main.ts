import { init } from "./app";

const simple_test = `
( type : o ) .
( o : k ) .
( o : l ) .
( ( o ) -> o : s ) .
( ( o ) -> type : a ) .
( ( o ) -> ( o ) -> type : b ) .
( l s k b : bt ) .
( ( o : x ) -> x x b : bt2 ) .
( ( ( o ) -> o ) -> type : c ) .
( ( o : x ) -> ( o : y ) -> ( x s y b ) -> type : e ) .
EOF
`;

const sub_test = `
( type : o ) .
( ( o ) -> type : a ) .
( ( o : x )  -> x a : m ) .
( ( o : x ) -> \
 ( ( x a ) -> o : y ) -> \
 ( x m y a : z ) -> type : w ) .
( o : k ) .
( ( o : x ) -> ( x a ) -> o : h ) .
( k m k h m [ ( k a : xx ) -> xx k h ]  k w : v ) .
EOF
`.replace(/\\\n/g, '');

const beta_test = `
( type : o ) .
( o : k ) .
( o : k2 ) .
( ( o ) -> type : a ) .
( ( o : x ) -> x a : m ) .
( ( o ) -> ( o ) -> o : b ) .
( ( ( o ) -> o : f ) -> ( o : x ) -> ( x f f a ) -> type : c ) .
( k2 k2 k b b m k [ ( o : t ) -> k2 t b ] c : d ) .
EOF
`
function go() {
  init({ input: beta_test });
}

go();
