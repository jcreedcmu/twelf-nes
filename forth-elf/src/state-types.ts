import { Rng } from "./range";

export type Action =
  | { t: 'changeStep', dframe: number }
  | { t: 'findPc', pc: number }
  | { t: 'setCurrentRange', range: Rng }
  ;

export type AppState = {
  frame: number,
  currentRange: Rng | undefined,
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
  | { t: '->', name: string | undefined }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.', name: string | undefined }
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


export type MetaCtxEntry =
  | { t: 'sub', sub: Ctx }
  | { t: 'ctx', ctx: Ctx }
  ;

export type CtlEntry = {
  pc: number
  program: Rng,
  defining: boolean,
};


export type StackEntry = {
  term: Expr,
  klass: Expr
};

export type Sig = SigEntry[];
export type Ctx = CtxEntry[];
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
