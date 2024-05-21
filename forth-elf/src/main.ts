import { init } from "./app";

const input = `
type : o .
o : k .
o : ell .
o -> o : s .
o -> type : a .
o -> o -> type : b .
ell s k b : bt .
o : x -> x x b : bt2 .
( o -> o ) -> type : c .
o : x -> o : y -> x s y b -> type : e .
bt k ell e : et .
k s bt2 k s k e : et2 .
EOF
`;

function go() {
  init({ input });
}

go();
