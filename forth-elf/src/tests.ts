export type TestCase = {
  name: string,
  input: string,
  expectSuccess: boolean,
};

export const allTests: TestCase[] = [
  {
    name: 'simple',
    expectSuccess: true,
    input: `
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
`,
  },
  {
    name: 'sub',
    expectSuccess: true,
    input: `
( type : o ) .
( ( o ) -> type : a ) .
( ( o : x )  -> x a : m ) .
( ( o : x ) -> ( ( x a ) -> o : y ) -> ( x m y a : z ) -> type : w ) .
( o : k ) .
( ( o : x ) -> ( x a ) -> o : h ) .
( k m k h m [ ( k a : xx ) -> xx k h ]  k w : v ) .
EOF
`,
  },
  {
    name: 'beta',
    expectSuccess: true,
    input: `
( type : o ) .
( o : k ) .
( o : k2 ) .
( ( o ) -> type : a ) .
( ( o : x ) -> x a : m ) .
( ( o ) -> ( o ) -> o : b ) .
( ( ( o ) -> o : f ) -> ( o : x ) -> ( x f f a ) -> type : c ) .
( k2 k2 k b b m k [ ( o : t ) -> k2 t b ] c : d ) .
EOF
`,
  },
  {
    name: 'capture (known bug)',
    expectSuccess: true,
    input: `
( type : o ) .
( type : p ) .
( ( p ) -> o : a ) .
( ( ( o ) -> o ) -> type : d ) .
( ( o ) -> ( o ) -> o : b ) .
( ( o : y ) -> ( [ ( o : x ) -> x y b ] d ) -> type : c ) .
( ( ( o ) -> o : f ) -> [ ( o : y ) -> y f ] d : q ) .
( ( p : x ) -> [ ( o : y ) -> y x a b ] q x a c : r ) .
EOF
`,
  },
  {
    name: 'alpha-equiv (known bug)',
    expectSuccess: true,
    input: `
( type : o ) .
( type : p ) .
( ( p ) -> o : a ) .
( ( ( o ) -> o ) -> type : d ) .
( ( o ) -> ( o ) -> o : b ) .
( ( o : y ) -> ( [ ( o : x ) -> x y b ] d ) -> type : c ) .
( ( ( o ) -> o : f ) -> [ ( o : y ) -> y f ] d : q ) .
( ( p : x1 ) -> [ ( o : y ) -> y x1 a b ] q x1 a c : r ) .
EOF
`,
  },
];
