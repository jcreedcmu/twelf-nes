import { produce } from 'immer';
import { mkState, parse, run, State, stringOfState } from './state';

export type AppState = {
  frame: number,
  states: State[],
}

export function mkAppState(input: string): AppState {
  const states = run(mkState(parse(input)));
  return {
    frame: 0,
    states,
  }
}

export function stringOfAppState(app: AppState): string {
  return `{white-fg}time:{/} ${app.frame}
${stringOfState(app.states[app.frame])}`;
}

export function nextStep(app: AppState): AppState {
  if (app.frame >= app.states.length - 1)
    return app;
  return produce(app, s => {
    s.frame++;
  });
}

export function prevStep(app: AppState): AppState {
  if (app.frame <= 0)
    return app;
  return produce(app, s => {
    s.frame--;
  });
}
