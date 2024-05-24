import { Rng } from "./range";

export type Action =
  | { t: 'setStep', frame: number }
  | { t: 'changeStep', dframe: number, multi: boolean }
  | { t: 'findPc', pc: number }
  | { t: 'setCurrentSel', sel: Selection }
  | { t: 'setCurrentPcSel', pc: number }
  ;

export type Selection =
  | { t: 'sigItem', index: number }
  | { t: 'metaItem', index: number }
  ;

export type AppState = {
  frame: number,
  currentSelection: Selection | undefined,
  currentPcSelection: number | undefined,
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
  | { t: 'lam', name: string | undefined, a: Expr, m: Expr }
  | { t: 'appc', cid: string, spine: Expr[] }
  | { t: 'appv', head: string, spine: Expr[] }


export type Tok =
  | { t: 'EOF' }
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
  pc: number,
};

export type CtxEntry = {
  name: string | undefined,
  klass: Expr,
  pc: number,
};

export type SubEntry = {
  name: string | undefined,
  term: Expr,
  klass: Expr,
  pc: number,
};

export type MetaCtxSubEntry = { t: 'sub', pc: number, sub: Sub };
export type MetaCtxCtxEntry = { t: 'ctx', pc: number, ctx: Ctx };

export type MetaCtxEntry =
  | MetaCtxSubEntry
  | MetaCtxCtxEntry
  ;

export type CtlEntry = {
  pc: number
  defining: boolean,
  name: string | undefined,
  readingName: boolean,
};

export type LabDataFrameStackEntry = {
  t: 'LabDataFrame',
  name: string | undefined,
  pc: number,
  term: Expr,
  klass: Expr
};

export type StackEntry =
  | { t: 'DataFrame', term: Expr, klass: Expr }
  | LabDataFrameStackEntry
  ;

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
