// @docs: src/SKILL.md
// @snippet-start
import { chain, success, failure } from '@k98kurz/functional-result';

const parseNumber = (str: string) => {
  const num = Number(str);
  return isNaN(num) ? failure('Invalid number') : success(num);
};

const result = success('42');
const chained = chain(parseNumber)(result); // success(42)

// If chain fails, the failure propagates
const badResult = success('abc');
const failedChain = chain(parseNumber)(badResult); // failure('Invalid number')
// @snippet-end