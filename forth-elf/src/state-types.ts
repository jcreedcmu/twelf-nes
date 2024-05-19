import { State } from "./state";

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
