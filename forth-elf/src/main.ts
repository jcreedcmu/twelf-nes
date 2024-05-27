import { init } from "./app";
import { noncapture_test_fail } from './tests';

function go() {
  init({ input: noncapture_test_fail });
}

go();
