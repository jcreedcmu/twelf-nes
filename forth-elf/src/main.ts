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
( k m k h m k h k w : v ) .
EOF
`.replace(/\\\n/g, '');

function go() {
  init({ input: sub_test });
}

go();
