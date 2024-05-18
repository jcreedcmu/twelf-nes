import * as blessed from 'blessed';
import { parse, mkState, stringOfState } from './state';
import { mkAppState, nextStep, prevStep, stringOfAppState } from './app-state';

////////////////////////////////////////////////////////////////

// Create a screen object.
var screen = blessed.screen({
  autoPadding: true,
  smartCSR: true
});

screen.title = 'Forth ELF';

// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  content: '',
  tags: true,
  style: {
  }
});

screen.append(box);

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  return process.exit(0);
});

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


let state = mkAppState(input);

screen.key(['left'], (ch, key) => {
  state = prevStep(state);
  box.setContent(stringOfAppState(state));
  screen.render();
});

screen.key(['right'], (ch, key) => {
  state = nextStep(state);
  box.setContent(stringOfAppState(state));
  screen.render();
});

// screen.on('keypress', (ch, key) => {
//   box.setContent(key.full);
//   screen.render();
// });

box.focus();


box.setContent(stringOfAppState(state));
screen.render();
