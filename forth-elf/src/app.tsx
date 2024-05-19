import ReactDOM from 'react-dom';
import { useEffectfulReducer } from './use-effectful-reducer';
import { State, run, mkState, parse, stringOfState } from './state';
import { produce } from 'immer';
import { useEffect } from 'react';

type AppProps = {
  input: string,
};

export function init(props: AppProps) {
  ReactDOM.render(<App {...props} />, document.querySelector('.app') as any);
}


export type Action =
  { t: 'changeStep', dframe: number }
  ;


export type AppState = {
  frame: number,
  states: State[],
}

type Effect =
  { t: 'effect' }
  ;

function reduce(state: AppState, action: Action): { state: AppState, effects: Effect[] } {
  return { state: reduce_inner(state, action), effects: [] };
}

function reduce_inner(state: AppState, action: Action): AppState {
  switch (action.t) {
    case 'changeStep': {
      const newFrame = Math.max(Math.min(state.frame + action.dframe, state.states.length - 1), 0);
      return produce(state, s => {
        s.frame = newFrame;
      });
    }
  }
}

export function mkAppState(input: string): AppState {
  const states = run(mkState(parse(input)));
  return {
    frame: 0,
    states,
  }
}


export type Dispatch = (action: Action) => void;


export function stringOfAppState(app: AppState): string {
  return `time:{/} ${app.frame}
${stringOfState(app.states[app.frame])}`;
}


function App(props: AppProps): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, AppState, Effect>(mkAppState(props.input), reduce, doEffect);

  const keydownListener = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft': {
        dispatch({ t: 'changeStep', dframe: -1 });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      case 'ArrowRight': {
        dispatch({ t: 'changeStep', dframe: 1 });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      default:
        console.log(e.code);
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', keydownListener);
    return () => {
      document.removeEventListener('keydown', keydownListener);
    }
  });

  function doEffect(s: AppState, dispatch: Dispatch, e: Effect) {
    switch (e.t) {
      case 'effect': throw new Error(`unimplemented`); break;
    }
  }

  return <pre>{stringOfAppState(state)}</pre>;
}
