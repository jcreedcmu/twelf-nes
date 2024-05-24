import { Rng } from "./range";

export type Action =
  | { t: 'setStep', frame: number }
  | { t: 'changeStep', dframe: number, multi: boolean }
  | { t: 'findPc', pc: number }
  | { t: 'setCurrentSel', sel: Selection }
  ;

export type Selection =
  | { t: 'sigItem', index: number }
  | { t: 'ctlItem', index: number }
  | { t: 'metaItem', index: number }
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
  | { t: ':' }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.' }
  | { t: 'id', name: string }
  ;

export type PosTok = { tok: Tok, range: Range };

export type SigEntry = {
  name: string,
  klass: Expr,
  program: Rng,
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
  | { t: 'ctx', pc: number, ctx: Ctx }
  ;

export type CtlEntry = {
  pc: number
  program: Rng,
  defining: boolean,
  name: string | undefined,
  readingName: boolean,
};


export type StackEntry =
  | { t: 'DataFrame', term: Expr, klass: Expr };

export type Sig = SigEntry[];
export type Ctx = CtxEntry[];
export type Sub = SubEntry[];
export type MetaCtx = MetaCtxEntry[];
export type Ctl = CtlEntry[];
export type Stack = StackEntry[];
export type Toks = Tok[];

export type State = {
  cframe: CtlEntry,
  sig: Sig,
  ctx: Ctx,
  meta: MetaCtx,
  ctl: Ctl,
  stack: Stack,
  toks: Toks,
  origToks: Toks[], // organized by decl, useful for debugging
  error: string | undefined,
}
