import ReactDOM from 'react-dom';
import { useEffectfulReducer } from './use-effectful-reducer';
import { run, mkState } from './state';
import { parse } from './parse';
import { State } from './state-types';
import { produce } from 'immer';
import { useEffect } from 'react';
import { renderState } from './render-state';
import { Action, AppState, Dispatch, Effect } from './state-types';

type AppProps = {
  input: string,
};

export function init(props: AppProps) {
  ReactDOM.render(<App {...props} />, document.querySelector('.app') as any);
}

function reduce(state: AppState, action: Action): { state: AppState, effects: Effect[] } {
  return { state: reduce_inner(state, action), effects: [] };
}

function reduce_inner(state: AppState, action: Action): AppState {
  switch (action.t) {
    case 'changeStep': {
      const newFrame = Math.max(Math.min(state.frame + action.dframe, state.states.length - 1), 0);
      return produce(state, s => {
        s.frame = newFrame;
        state.currentRange = undefined;
      });
    }
    case 'setStep': {
      const newFrame = Math.max(Math.min(action.frame, state.states.length - 1), 0);
      return produce(state, s => {
        s.frame = newFrame;
        state.currentRange = undefined;
      });
    }
    case 'setCurrentRange': {
      return produce(state, s => {
        state.currentRange = action.range;
      });
    }
  }
}

export function mkAppState(input: string): AppState {
  const states = run(mkState(parse(input)));
  return {
    frame: 0,
    states,
    currentRange: undefined,
  }
}

export function renderAppState(app: AppState, dispatch: Dispatch): JSX.Element {
  return <div><b>time</b>: {app.frame}<br />
    {renderState(app.states[app.frame], dispatch)}</div>;
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

  return renderAppState(state, dispatch);
}
