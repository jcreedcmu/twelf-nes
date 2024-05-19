import ReactDOM from 'react-dom';
import { useEffectfulReducer } from './use-effectful-reducer';

type AppProps = {

};

export function init(props: AppProps) {
  ReactDOM.render(<App {...props} />, document.querySelector('.app') as any);
}


export type Action =
  { t: 'action' }
  ;


export type State = {
}

type Effect =
  { t: 'effect' }
  ;

function reduce(state: State, action: Action): { state: State, effects: Effect[] } {
  return { state: state, effects: [] };
}


function mkState(): State {
  return {
  };
}


export type Dispatch = (action: Action) => void;

function App(props: AppProps): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, State, Effect>(mkState(), reduce, doEffect);

  function doEffect(s: State, dispatch: Dispatch, e: Effect) {
    switch (e.t) {
      case 'effect': throw new Error(`unimplemented`); break;
    }
  }

  return <div>hello</div>;
}
