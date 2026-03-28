import ReactDOM from 'react-dom';
import { useEffectfulReducer } from './use-effectful-reducer';
import { run, mkState, getCtlDepth } from './state';
import { parse } from './parse';
import { State } from './state-types';
import { produce } from 'immer';
import { useEffect } from 'react';
import { renderState } from './render-state';
import { Action, AppState, Dispatch, Effect } from './state-types';
import { TestCase } from './tests';

type AppProps = {
  tests: TestCase[],
  initialTest: number,
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
            s.currentPcSelection = undefined;
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
          s.currentPcSelection = undefined;
        });
      }
    }
    case 'findPc': {
      const newFrame = state.states.findIndex(state => state.cframe.pc == action.pc);
      if (newFrame != -1) {
        return produce(state, s => {
          s.frame = newFrame;
          s.currentSelection = undefined;
          s.currentPcSelection = undefined;
        });
      }
      else {
        return state;
      }
    }
    case 'setCurrentSel': {
      return produce(state, s => {
        s.currentSelection = action.sel;
      });
    }
    case 'setCurrentPcSel': {
      return produce(state, s => {
        s.currentPcSelection = action.pc;
      });
    }
    case 'setStep': {
      return produce(state, s => {
        s.frame = action.frame;
        s.currentSelection = undefined;
        s.currentPcSelection = undefined;
      });
    }
    case 'loadInput': {
      return mkAppState(action.input);
    }
  }
}

export function mkAppState(input: string): AppState {
  const states = run(mkState(parse(input)));
  return {
    frame: 0,
    states,
    currentSelection: undefined,
    currentPcSelection: undefined,
  }
}

export function renderAppState(app: AppState, dispatch: Dispatch): JSX.Element {
  return <div>
    <div className="panel">
      <div style={{ marginBottom: 4 }}><b>time</b>: {app.frame}</div>
      <input type="range"
        min={0} max={app.states.length - 1} style={{ width: '100%' }} value={app.frame}
        onInput={(e: React.FormEvent<HTMLInputElement>) => { dispatch({ t: 'setStep', frame: parseInt((e.target as HTMLInputElement).value) }) }} />
    </div>
    {renderState(app.states[app.frame], dispatch, app.currentSelection, app.currentPcSelection)}
  </div>;
}

function App(props: AppProps): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, AppState, Effect>(mkAppState(props.tests[props.initialTest].input), reduce, doEffect);

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

  return <div>
    <div className="panel">
      <h1 style={{ margin: '0 0 8px' }}>Forth ELF Test</h1>
      <div style={{ marginBottom: 8 }}>
        <label>Test: <select onChange={(e) => {
          dispatch({ t: 'loadInput', input: props.tests[parseInt(e.target.value)].input });
        }}>
          {props.tests.map((test, i) => (
            <option key={i} value={i}>{test.name}</option>
          ))}
        </select></label>
      </div>
      <div className="help-text">
        Use left/right arrow keys to step forward and backward in time.
        Shift-arrow keys to "step over" like a debugger.
      </div>
    </div>
    {renderAppState(state, dispatch)}
  </div>;
}
