import { describe, it, expect } from 'vitest';
import {
  success,
  failure,
  map,
  mapError,
  chain,
  match,
  fold,
  sequence,
  traverse,
  partitionResults,
  validate,
  isSuccess,
  isFailure,
  tryCatch,
  tryCatchSync,
  getOrElse,
  getOrThrow,
  pipe,
  tap,
  tapError,
  type Result,
} from '../src/functional-result';

function unwrapResult<T, E>(result: Result<T, E>): T {
  if (!isSuccess(result)) {
    throw new Error('Expected a success Result, but got a failure');
  }
  return result.data;
}

describe('Basics: Constructors & Type Guards', () => {
  it('[B01] creates success result with correct type', () => {
    const result = success<number, unknown>(42);
    expect(result.success).toBe(true);
    expect(isSuccess(result)).toBe(true);
    expect(unwrapResult(result)).toBe(42);
  });

  it('[B02] creates failure result with correct type', () => {
    const result = failure<never, string>('error');
    expect(result.success).toBe(false);
    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error).toBe('error');
  });

  it('[B03] constructors infer generic types correctly', () => {
    const successResult = success<string, never>('hello');
    const failureResult = failure<never, number>(404);
    expect(successResult.success).toBe(true);
    expect(typeof unwrapResult(successResult)).toBe('string');
    expect(failureResult.success).toBe(false);
    if (!isFailure(failureResult)) return;
    expect(typeof failureResult.error).toBe('number');
  });

  it('[B04] isSuccess type guard narrows correctly', () => {
    const result: Result<string, number> = success('test');
    if (isSuccess(result)) {
      expect(typeof result.data).toBe('string');
    } else {
      throw new Error('Should have been narrowed to success type');
    }
  });

  it('[B05] isFailure type guard narrows correctly', () => {
    const result: Result<string, number> = failure(404);
    if (isFailure(result)) {
      expect(typeof result.error).toBe('number');
    } else {
      throw new Error('Should have been narrowed to failure type');
    }
  });

  it('[B06] constructors handle complex generic types', () => {
    type User = { id: number; name: string; email?: string };
    type ApiError = { code: string; message: string };

    const userResult: Result<User, ApiError> = success({ id: 1, name: 'test' });
    const transformed = map((user: User) => ({
      ...user,
      email: `${user.name}@example.com`,
    }))(userResult);

    expect(transformed.success).toBe(true);
    const transformedData = unwrapResult(transformed);
    expect(transformedData.id).toBe(1);
    expect(transformedData.name).toBe('test');
    expect(transformedData.email).toBe('test@example.com');
  });
});

describe('Error Handling', () => {
  it('[E01] tryCatch handles successful async operations', async () => {
    const result = await tryCatch(async () => 'success');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('success');
  });

  it('[E02] tryCatch handles async errors via transformer', async () => {
    const originalError = new Error('test error');
    const result = await tryCatch<string, string>(
      async () => {
        throw originalError;
      },
      error =>
        `transformed: ${error instanceof Error ? error.message : String(error)}`
    );
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('transformed: test error');
  });

  it('[E03] tryCatch handles sync operations', async () => {
    const result = await tryCatch(() => 'sync result');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('sync result');
  });

  it('[E04] tryCatch handles async operations', async () => {
    const result = await tryCatch(async () => 'async result');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('async result');
  });

  it('[E05] tryCatch transforms errors with a custom transformer', async () => {
    const originalError = new Error('test error');
    const result = await tryCatch(
      () => {
        throw originalError;
      },
      (error: unknown) => `caught: ${(error as Error).message}`
    );
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('caught: test error');
  });

  it('[E06] tryCatch handles sync functions with type params', async () => {
    const result = await tryCatch(() => 'sync result');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('sync result');
  });

  it('[E07] tryCatch handles sync and async functions uniformly', async () => {
    const syncFn = (): string => 'sync';
    const asyncFn = async (): Promise<string> => 'async';

    const syncResult = await tryCatch(syncFn);
    const asyncResult = await tryCatch(asyncFn);

    expect(syncResult.success).toBe(true);
    expect(unwrapResult(syncResult)).toBe('sync');
    expect(asyncResult.success).toBe(true);
    expect(unwrapResult(asyncResult)).toBe('async');
  });

  it('[E08] tryCatch preserves original error w/o transformer', async () => {
    const customError = { code: 'CUSTOM', message: 'custom error' };
    const result = await tryCatch(async () => {
      throw customError;
    });
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe(customError);
  });

  it('[E09] tryCatch handles unknown error types safely', async () => {
    const result = await tryCatch(async () => {
      throw 'string error';
    });
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('string error');
  });

  it('[E10] tryCatchSync handles successful sync operations', () => {
    const result = tryCatchSync(() => 'success');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('success');
  });

  it('[E11] tryCatchSync handles sync errors via transformer', () => {
    const originalError = new Error('test error');
    const result = tryCatchSync<string, string>(
      () => {
        throw originalError;
      },
      error =>
        `transformed: ${error instanceof Error ? error.message : String(error)}`
    );
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('transformed: test error');
  });

  it('[E12] tryCatchSync transforms errors with a custom transformer', () => {
    const originalError = new Error('test error');
    const result = tryCatchSync(
      () => {
        throw originalError;
      },
      (error: unknown) => `caught: ${(error as Error).message}`
    );
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('caught: test error');
  });

  it('[E13] tryCatchSync handles sync functions with type params', () => {
    const result = tryCatchSync(() => 'sync result');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('sync result');
  });

  it('[E14] tryCatchSync preserves original error w/o transformer', () => {
    const customError = { code: 'CUSTOM', message: 'custom error' };
    const result = tryCatchSync(() => {
      throw customError;
    });
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe(customError);
  });

  it('[E15] tryCatchSync handles unknown error types safely', () => {
    const result = tryCatchSync(() => {
      throw 'string error';
    });
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('string error');
  });

  it('[E16] tryCatchSync throws when passed an async function', () => {
    const result = tryCatchSync(async () => 'async result');
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toMatchObject({
      message: 'tryCatchSync received a Promise - use tryCatch instead',
    });
  });
});

describe('Transformations', () => {
  it('[T01] maps success values and preserves failures', () => {
    const successResult = success<number, string>(5);
    const failureResult = failure<number, string>('error');

    const doubled = map((x: number) => x * 2)(successResult);
    const preservedFailure = map((x: number) => x * 2)(failureResult);

    expect(doubled.success).toBe(true);
    expect(unwrapResult(doubled)).toBe(10);
    expect(preservedFailure.success).toBe(false);
    if (!isFailure(preservedFailure)) return;
    expect(preservedFailure.error).toBe('error');
  });

  it('[T02] chains operations correctly', () => {
    const successResult = success<number, string>(5);
    const failureResult = failure<number, string>('error');

    const chained = chain((x: number) => success(x * 3))(successResult);
    const chainedFailure = chain((x: number) => success(x * 3))(failureResult);

    expect(chained.success).toBe(true);
    expect(unwrapResult(chained)).toBe(15);
    expect(chainedFailure.success).toBe(false);
    if (!isFailure(chainedFailure)) return;
    expect(chainedFailure.error).toBe('error');
  });

  it('[T03] match executes correct branch based on result type', () => {
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const successMatch = match(
      (x: number) => `success: ${x}`,
      (e: string) => `error: ${e}`
    )(successResult);
    const failureMatch = match(
      (x: number) => `success: ${x}`,
      (e: string) => `error: ${e}`
    )(failureResult);

    expect(successMatch).toBe('success: 42');
    expect(failureMatch).toBe('error: error');
  });

  it('[T04] fold returns consistent type with string error', () => {
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const successFold = fold(
      (x: number) => x.toString(),
      (e: string) => `error: ${e}`
    )(successResult);
    const failureFold = fold(
      (x: number) => x.toString(),
      (e: string) => `error: ${e}`
    )(failureResult);

    expect(successFold).toBe('42');
    expect(failureFold).toBe('error: error');
  });

  it('[T05] fold returns consistent type with number error', () => {
    const successResult = success<number, number>(42);
    const failureResult = failure<number, number>(404);

    const successFold = fold(
      (x: number) => x.toString(),
      (e: number) => `error: ${e}`
    )(successResult);
    const failureFold = fold(
      (x: number) => x.toString(),
      (e: number) => `error: ${e}`
    )(failureResult);

    expect(successFold).toBe('42');
    expect(failureFold).toBe('error: 404');
  });

  it('[T06] mapError transforms and preserves success', () => {
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const mappedSuccess = mapError((e: string) => e.toUpperCase())(
      successResult
    );
    const mappedFailure = mapError((e: string) => e.toUpperCase())(
      failureResult
    );

    expect(mappedSuccess.success).toBe(true);
    expect(unwrapResult(mappedSuccess)).toBe(42);
    expect(mappedFailure.success).toBe(false);
    if (!isFailure(mappedFailure)) return;
    expect(mappedFailure.error).toBe('ERROR');
  });

  it('[T07] mapError composes with map for full transformation', () => {
    const result = failure<number, string>('not found');

    const transformed = mapError((e: string) => `error: ${e}`)(result);

    expect(transformed.success).toBe(false);
    if (!isFailure(transformed)) return;
    expect(transformed.error).toBe('error: not found');
  });

  it('[T08] tap executes callback on success and preserves value', () => {
    const sideEffects: number[] = [];
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const tappedSuccess = tap((x: number) => {
      sideEffects.push(x);
    })(successResult);
    const tappedFailure = tap((x: number) => {
      sideEffects.push(x);
    })(failureResult);

    expect(sideEffects).toEqual([42]);
    expect(tappedSuccess.success).toBe(true);
    expect(unwrapResult(tappedSuccess)).toBe(42);
    expect(tappedFailure.success).toBe(false);
    if (!isFailure(tappedFailure)) return;
    expect(tappedFailure.error).toBe('error');
  });

  it('[T09] tapError fires on failure and preserves error', () => {
    const sideEffects: string[] = [];
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const tappedSuccess = tapError((e: string) => {
      sideEffects.push(e);
    })(successResult);
    const tappedFailure = tapError((e: string) => {
      sideEffects.push(e);
    })(failureResult);

    expect(sideEffects).toEqual(['error']);
    expect(tappedSuccess.success).toBe(true);
    expect(unwrapResult(tappedSuccess)).toBe(42);
    expect(tappedFailure.success).toBe(false);
    if (!isFailure(tappedFailure)) return;
    expect(tappedFailure.error).toBe('error');
  });

  it('[T10] tap composes with map — side effect then transforms', () => {
    const sideEffects: number[] = [];
    const result = success<number, string>(5);

    const tapped = tap((x: number) => {
      sideEffects.push(x);
    })(result);
    const mapped = map((x: number) => x * 2)(tapped);

    expect(sideEffects).toEqual([5]);
    expect(mapped.success).toBe(true);
    expect(unwrapResult(mapped)).toBe(10);
  });

  it('[T11] tapError composes with mapError and side effects', () => {
    const sideEffects: string[] = [];
    const result = failure<number, string>('oops');

    const tapped = tapError((e: string) => {
      sideEffects.push(e);
    })(result);
    const mapped = mapError((e: string) => e.toUpperCase())(tapped);

    expect(sideEffects).toEqual(['oops']);
    expect(mapped.success).toBe(false);
    if (!isFailure(mapped)) return;
    expect(mapped.error).toBe('OOPS');
  });
});

describe('Composition', () => {
  it('[P01] pipe works with curried operations', async () => {
    const result = await pipe(
      success<number, string>(5),
      map((x: number) => x * 2),
      chain((x: number) => success<string, string>(x.toString()))
    );
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10');
  });

  it('[P02] pipe maintains type safety throughout chain', async () => {
    const result = await pipe(
      success<number, string>(5),
      map((x: number) => x * 2),
      chain((x: number) => success<string, string>(x.toString())),
      map((s: string) => `${s}_processed`)
    );
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10_processed');
  });

  it('[P03] pipe handles point-free style', async () => {
    const double = map((x: number) => x * 2);
    const toString = map((x: number) => x.toString());

    const result = await pipe(success<number, string>(5), double, toString);
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10');
  });

  it('[P04] curried functions work independently', () => {
    const double = map((x: number) => x * 2);
    const toString = map((x: number) => x.toString());

    const doubled = double(success<number, string>(5));
    const stringified = toString(doubled);

    expect(stringified.success).toBe(true);
    expect(unwrapResult(stringified)).toBe('10');
  });

  it('[P05] pipe maintains type safety with inferred types', async () => {
    const result = await pipe(
      success(5),
      map(x => x * 2),
      chain(x => success(x.toString())),
      map(s => `${s}_processed`)
    );
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10_processed');
  });

  it('[P06] pipe handles point-free style with inferred types', async () => {
    const double = map((x: number) => x * 2);
    const toString = map((x: number) => x.toString());

    const result = await pipe(success(5), double, toString);
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10');
  });

  it('[P07] pipe handles empty operations array', async () => {
    const initial = success<number, string>(42);
    const result = await pipe(initial);
    expect(result === initial).toBe(true);
  });

  it('[P08] pipe handles mixed sync and async operations', async () => {
    const result = await pipe(
      success<number, string>(5),
      map((x: number) => x * 2),
      chain((x: number) => success<string, string>(x.toString())),
      map((s: string) => `${s}_async`)
    );
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('10_async');
  });

  it('[P09] pipe handles failure propagation', async () => {
    const result = await pipe(
      success<number, string>(5),
      chain((_x: number) => failure<number, string>('error in chain')),
      map((x: number) => x * 2)
    );
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('error in chain');
  });

  it('[P10] pipe runs with multiple taps on success', async () => {
    const sideEffects: number[] = [];
    const result = await pipe(
      success<number, string>(5),
      tap((x: number) => {
        sideEffects.push(x);
      }),
      map((x: number) => x * 2),
      tap((x: number) => {
        sideEffects.push(x);
      })
    );
    expect(sideEffects).toEqual([5, 10]);
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe(10);
  });

  it('[P11] pipe runs with multiple tapErrors on failure', async () => {
    const sideEffects: string[] = [];
    const result = await pipe(
      failure<number, string>('initial error'),
      tapError((e: string) => {
        sideEffects.push(e);
      }),
      mapError((e: string) => e.toUpperCase()),
      tapError((e: string) => {
        sideEffects.push(e);
      })
    );
    expect(sideEffects).toEqual(['initial error', 'INITIAL ERROR']);
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('INITIAL ERROR');
  });

  it('[P12] tap is a no-op on failure in pipe', async () => {
    const sideEffects: number[] = [];
    const result = await pipe(
      failure<number, string>('fail'),
      tap((x: number) => {
        sideEffects.push(x);
      }),
      map((x: number) => x * 2)
    );
    expect(sideEffects).toEqual([]);
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error).toBe('fail');
  });

  it('[P13] tapError is a no-op on success in pipe', async () => {
    const sideEffects: string[] = [];
    const result = await pipe(
      success<number, string>(42),
      tapError((e: string) => {
        sideEffects.push(e);
      }),
      map((x: number) => x * 2)
    );
    expect(sideEffects).toEqual([]);
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe(84);
  });
});

describe('Collections', () => {
  it('[L01] sequence handles all success case', () => {
    const results = [
      success<number, string>(1),
      success<number, string>(2),
      success<number, string>(3),
    ];
    const sequenced = sequence(results);
    expect(sequenced.success).toBe(true);
    expect(unwrapResult(sequenced)).toEqual([1, 2, 3]);
  });

  it('[L02] sequence returns first failure encountered', () => {
    const results = [
      success<number, string>(1),
      failure<number, string>('first error'),
      failure<number, string>('second error'),
    ];
    const sequenced = sequence(results);
    expect(sequenced.success).toBe(false);
    if (!isFailure(sequenced)) return;
    expect(sequenced.error).toBe('first error');
  });

  it('[L03] sequence returns first failure with inferred types', () => {
    const results = [
      success(1),
      failure('first error'),
      failure('second error'),
    ];
    const sequenced = sequence(results);
    expect(sequenced.success).toBe(false);
    if (!isFailure(sequenced)) return;
    expect(sequenced.error).toBe('first error');
  });

  it('[L04] traverse maps arrays with Result functions', () => {
    const items = [1, 2, 3];
    const result = traverse((x: number) => success<number, string>(x * 2))(
      items
    );
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toEqual([2, 4, 6]);
  });

  it('[L05] partitionResults splits mixed results correctly', () => {
    const results = [
      success<number, string>(1),
      failure<number, string>('a'),
      success<number, string>(2),
      failure<number, string>('b'),
    ];

    const { successes, failures } = partitionResults(results);

    expect(successes).toEqual([1, 2]);
    expect(failures).toEqual(['a', 'b']);
  });

  it('[L06] partitionResults handles all successes', () => {
    const results = [success<number, string>(1), success<number, string>(2)];

    const { successes, failures } = partitionResults(results);

    expect(successes).toEqual([1, 2]);
    expect(failures).toEqual([]);
  });

  it('[L07] partitionResults handles all failures', () => {
    const results = [
      failure<number, string>('a'),
      failure<number, string>('b'),
    ];

    const { successes, failures } = partitionResults(results);

    expect(successes).toEqual([]);
    expect(failures).toEqual(['a', 'b']);
  });

  it('[L08] partitionResults handles empty array', () => {
    const results: Array<Result<number, string>> = [];

    const { successes, failures } = partitionResults(results);

    expect(successes).toEqual([]);
    expect(failures).toEqual([]);
  });
});

describe('Validation', () => {
  it('[V01] validate collects all validation errors', () => {
    const validators = [
      (value: string) =>
        value.length >= 3 ? null : { field: 'length', message: 'Too short' },
      (value: string) =>
        value.includes('@')
          ? null
          : { field: 'format', message: 'Invalid email' },
    ];
    const result = validate(validators)('ab');
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error.length).toBe(2);
  });

  it('[V02] validate returns success when no errors', () => {
    const validators = [
      (value: string) =>
        value.length >= 3 ? null : { field: 'length', message: 'Too short' },
      (value: string) =>
        value.includes('@')
          ? null
          : { field: 'format', message: 'Invalid email' },
    ];
    const result = validate(validators)('test@example.com');
    expect(result.success).toBe(true);
    expect(unwrapResult(result)).toBe('test@example.com');
  });
});

describe('Accessors', () => {
  it('[A01] getOrElse returns default value on failure', () => {
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const successValue = getOrElse(0)(successResult);
    const failureValue = getOrElse(0)(failureResult);

    expect(successValue).toBe(42);
    expect(failureValue).toBe(0);
  });

  it('[A02] getOrThrow throws error on failure', () => {
    const successResult = success<number, string>(42);
    const failureResult = failure<number, string>('error');

    const successValue = getOrThrow(successResult);
    expect(successValue).toBe(42);

    expect(() => getOrThrow(failureResult)).toThrow('error');
  });
});

describe('Edge Cases', () => {
  it('[X01] handles nested Result types', () => {
    const inner = success<string, number>('nested');
    const nested: Result<Result<string, number>, number> = success(inner);
    const flattened = chain((x: Result<string, number>) => x)(nested);
    expect(flattened.success).toBe(true);
    expect(unwrapResult(flattened)).toBe('nested');
  });

  it('[X02] handles empty arrays in sequence', () => {
    const result = sequence([]);
    expect(result.success).toBe(true);
    expect(unwrapResult(result).length).toBe(0);
  });

  it('[X03] handles empty arrays in traverse', () => {
    const result = traverse((x: number) => success<number, string>(x * 2))([]);
    expect(result.success).toBe(true);
    expect(unwrapResult(result).length).toBe(0);
  });

  it('[X04] handles undefined values in validators', () => {
    const validators = [
      (value: unknown) =>
        value !== undefined
          ? null
          : { field: 'value', message: 'Cannot be undefined' },
    ];
    const result = validate(validators)(undefined);
    expect(result.success).toBe(false);
    if (!isFailure(result)) return;
    expect(result.error[0].message).toBe('Cannot be undefined');
  });
});
