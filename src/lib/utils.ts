/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, Err, ok } from "./result";
import { Result, ResultFn } from "./types";

/**
 * Wraps a function in a try-catch block and returns a {@link Result}.
 *
 * @param fn - The function to execute safely
 * @param label - The error label to use if the function throws
 * @returns A {@link Result}
 *
 * @example
 * ```typescript
 * const [error, value] = safe(() => JSON.parse('{"foo": "bar"}'), 'JSON_PARSE_ERROR');
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(value);
 * }
 * ```
 *
 * @group Sync
 */
export const safe = <T, E extends string>(
  fn: () => T,
  label: E,
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(Err.from(error, label));
  }
};

/**
 * Extracts the successful value from a {@link Result}, throwing an error if it represents a failure.
 *
 * @param result - A {@link Result}
 * @returns The success value if present
 * @throws An {@link Err} if the {@link Result} contains an error
 *
 * @example
 * ```typescript
 * const value = unsafe(someSafeFunction());
 * // If someSafeFunction() returns an error, the error will be thrown
 * ```
 *
 * @group Sync
 */
export const unsafe = <T, E extends string>(result: Result<T, E>): T => {
  const [error, value] = result;
  if (error) {
    throw error;
  }
  return value;
};

/**
 * Wraps a function that may throw into a function that returns a {@link Result}.
 *
 * @param fn - The function to wrap that may throw an error
 * @param label - A label to identify the error when the function throws
 * @returns A function that returns a {@link Result}
 *
 * @example
 * ```typescript
 * const safeJSONParse = fromThrowable(JSON.parse, 'PARSE_ERROR');
 * const success = safeJSONParse('{"foo": "bar"}'); // [null, { foo: "bar" }]
 * const fail = safeJSONParse('invalid json'); // [Err<'PARSE_ERROR'>, undefined]
 * ```
 *
 * @group Sync
 */
export const fromThrowable = <A extends any[], T, E extends string>(
  fn: (...args: A) => T,
  label: E,
): ResultFn<A, T, E> => {
  return (...args: A): Result<T, E> => {
    return safe(() => fn(...args), label);
  };
};
