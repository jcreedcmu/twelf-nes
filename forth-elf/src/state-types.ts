export type Action =
  | { t: 'changeStep', dframe: number }
  | { t: 'setStep', frame: number }
  ;

export type AppState = {
  frame: number,
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
  | { t: '>', name: string | undefined }
  | { t: '(' }
  | { t: ')' }
  | { t: '[' }
  | { t: ']' }
  | { t: '.', name: string | undefined }
  | { t: 'id', name: string }
  ;

export type Rng = { first: number, last: number };

export type PosTok = { tok: Tok, range: Range };

export type SigEntry = {
  name: string,
  klass: Expr,
  range: Rng,
  program: Tok[],
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
  // Control Frame?
  pc: number,
  program: Tok[],

  sig: Sig,
  ctx: Ctx,
  meta: MetaCtx,
  ctl: Ctl,
  stack: Stack,
  toks: Toks,
  origToks: Toks[], // organized by decl, useful for debugging
  error: string | undefined,
}
