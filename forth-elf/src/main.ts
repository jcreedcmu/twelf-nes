import { init } from "./app";

const input = `
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

function go() {
  init({ input });
}

go();
