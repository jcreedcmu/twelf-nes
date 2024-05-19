import { init } from "./app";

const input = `
type : o .
o : k .
o : l .
( o > o ) : s .
( o > type ) : a .
( o > o > type ) : b .
( l s k b ) bt .
EOF
`;

function go() {
  init({ input });
}

go();
