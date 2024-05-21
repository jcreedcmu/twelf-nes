import { Rng } from "./range";

export type Pc =
  | { t: 'tokstream', index: number }
  | { t: 'sigEntry', sigIx: number, tokIx: number }
  ;

export type Action =
  | { t: 'setStep', frame: number }
  | { t: 'changeStep', dframe: number, multi: boolean }
  | { t: 'findPc', pc: number }
  | { t: 'setCurrentSel', sel: Selection }
  ;

export type Selection =
  | { t: 'sigItem', index: number }
  | { t: 'ctlItem', index: number }
  ;

export type AppState = {
  frame: number,
  currentSelection: Selection | undefined,
  states: State[],
}

export type Effect =
  { t: 'effect' }
  ;

export type Dispatch = (action: Action) => void;

export type Expr =
  | { t: 'type' }
  | { t: 'kind' }
  | { t: 'pi', name: string | undefined, a: Expr, b: Expr }
  | { t: 'appc', cid: string, spine: Expr[] }
  | { t: 'appv', head: string, spine: Expr[] }


export type Tok =
  | { t: 'type' }
  | { t: '->' }
  | { t: 'grab' }
  | { t: ':' }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.' }
  | { t: 'ret' }
  | { t: 'id', name: string }
  ;

export type PosTok = { tok: Tok, range: Range };

export type SigEntry = {
  name: string,
  klass: Expr,
  program: Rng,
  code: Tok[],
};

export type CtxEntry = {
  name: string | undefined,
  klass: Expr,
  range: Rng,
};

export type SubEntry = {
  name: string | undefined,
  term: Expr,
  klass: Expr,
  range: Rng,
};


export type MetaCtxEntry =
  | { t: 'sub', sub: Sub }
  | { t: 'ctx', ctx: Ctx }
  ;

export type CtlEntry = {
  pc: Pc
  program: Rng,
  code: Tok[],
  name: string | undefined,
  readingName: boolean,
};


export type DataStackEntry = {
  t: 'data',
  term: Expr,
  klass: Expr
};

export type StackEntry =
  | DataStackEntry
  | { t: 'control', cframe: CtlEntry };

export type Sig = SigEntry[];
export type Ctx = CtxEntry[];
export type Sub = SubEntry[];
export type MetaCtx = MetaCtxEntry[];
export type Stack = StackEntry[];
export type Toks = Tok[];

export type State = {
  cframe: CtlEntry,
  sig: Sig,
  ctx: Ctx,
  meta: MetaCtx,
  stack: Stack,
  toks: Toks,
  origToks: Toks[], // organized by decl, useful for debugging
  error: string | undefined,
}
