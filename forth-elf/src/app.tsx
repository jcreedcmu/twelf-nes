import ReactDOM from 'react-dom';
import { useEffectfulReducer } from './use-effectful-reducer';
import { run, mkState, getCtlDepth } from './state';
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

  function depthAt(frame: number) {
    return getCtlDepth(state.states[frame]);
  }

  function getChosenFrame(dframe: number): number | undefined {
    const origDepth = depthAt(state.frame);
    if (dframe == -1) {
      for (let i = state.frame - 1; i >= 0; i--) {
        if (depthAt(i) <= origDepth)
          return i;
      }
      return undefined;
    }
    else if (dframe == 1) {
      for (let i = state.frame + 1; i < state.states.length; i++) {
        if (depthAt(i) <= origDepth)
          return i;
      }
      return undefined;
    }
    else throw new Error(`expected dframe to be +/-1 when using changeStep with multi = true`);
  }

  switch (action.t) {
    case 'changeStep': {
      if (action.multi) {
        const frame = getChosenFrame(action.dframe);
        if (frame != undefined) {
          return produce(state, s => {
            s.frame = frame;
            s.currentSelection = undefined;
          });
        }
        else {
          return state;
        }
      }
      else {
        const newFrame = Math.max(Math.min(state.frame + action.dframe, state.states.length - 1), 0);
        return produce(state, s => {
          s.frame = newFrame;
          s.currentSelection = undefined;
        });
      }
    }
    case 'findPc': {
      const newFrame = state.states.findIndex(state => state.cframe.pc == action.pc);
      if (newFrame != -1) {
        return produce(state, s => {
          s.frame = newFrame;
          s.currentSelection = undefined;
        });
      }
      else {
        return state;
      }
    }
    case 'setCurrentSig': {
      return produce(state, s => {
        s.currentSelection = { t: 'sigItem', index: action.index };
      });
    }
  }
}

export function mkAppState(input: string): AppState {
  const states = run(mkState(parse(input)));
  return {
    frame: 0,
    states,
    currentSelection: undefined,
  }
}

export function renderAppState(app: AppState, dispatch: Dispatch): JSX.Element {
  return <div><b>time</b>: {app.frame}<br /><br />
    {renderState(app.states[app.frame], dispatch, app.currentSelection)}</div>;
}

function App(props: AppProps): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, AppState, Effect>(mkAppState(props.input), reduce, doEffect);

  const keydownListener = (e: KeyboardEvent) => {
    const multi = e.shiftKey;
    switch (e.code) {
      case 'ArrowLeft': {
        dispatch({ t: 'changeStep', dframe: -1, multi });
        e.stopPropagation();
        e.preventDefault();
        break;
      }
      case 'ArrowRight': {
        dispatch({ t: 'changeStep', dframe: 1, multi });
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
