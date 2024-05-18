import * as blessed from 'blessed';

type Tok =
  | { t: 'type' }
  | { t: '>', name: string }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.', name: string }
  | { t: 'var', name: string }
  ;

type Rng = { first: number, last: number };

type PosTok = { tok: Tok, range: Range };

type SigEntry = {
  name: string,
  range: Range,
};

type CtxEntry = {
  name: string,
  range: Range,
};


type MetaCtxEntry =
  | { t: 'sub', sub: Ctx }
  | { t: 'ctx', ctx: Ctx }
  ;

type CtlEntry = {
  pc: number
};


type StackEntry = {

};

type Sig = SigEntry[];
type Ctx = CtxEntry[];
type MetaCtx = MetaCtxEntry[];
type Ctl = CtlEntry[];
type Stack = StackEntry[];

type State = {
  pc: number,
  sig: Sig,
  ctx: Ctx,
  meta: MetaCtx,
  ctl: Ctl,
  stack: Stack,
}

function mkState(): State {
  return {
    pc: 0,
    ctl: [],
    ctx: [],
    meta: [],
    sig: [],
    stack: [],
  }
}

function stringOfState(state: State) {
  return `{bold}sig{/bold}:
{bold}stack{/bold}: foo
`
}

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

screen.on('keypress', (ch, key) => {
  box.setContent(key.full);
  screen.render();
});

box.focus();

const state = mkState();
box.setContent(stringOfState(state));
screen.render();
