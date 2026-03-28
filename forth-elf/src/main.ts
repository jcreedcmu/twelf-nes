import { init } from "./app";
import { allTests } from './tests';

function go() {
  init({ tests: allTests, initialTest: 0 });
}

go();
