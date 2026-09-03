// @docs: readme.md
// @snippet-start
import { chain, success, failure } from '@k98kurz/functional-result';

const parseAndDouble = (str: string) => {
  const num = Number(str);
  return isNaN(num) ? failure('Invalid number') : success(num * 2);
};

const result = success('5');
const chained = chain(parseAndDouble)(result);
// { success: true, data: 10 }

// chain may return a failure
const abc = success('abc');
const failedChain = chain(parseAndDouble)(abc);
// { success: false, error: 'Invalid number' }
// @snippet-end