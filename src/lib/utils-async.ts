/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, Err, ok } from "./result";
import { ResultAsync, ResultAsyncFn } from "./types";

/**
 * Wraps a promise in a try-catch block and returns a {@link ResultAsync}.
 *
 * @param promise - The promise to execute safely
 * @param label - The error label to use if the promise rejects
 * @returns A {@link Result} containing either the successful value or an error with the provided label
 *
 * @example
 * ```typescript
 * const [error, value] = await safeAsync(fetch('https://api.example.com/data'), 'FETCH_ERROR');
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(value);
 * }
 * ```
 *
 * @group Async
 */
export const safeAsync = async <T, E extends string>(
  promise: Promise<T>,
  label: E,
): ResultAsync<T, E> => {
  try {
    return ok(await promise);
  } catch (error) {
    return err(Err.from(error, label));
  }
};

/**
 * Extracts the successful value from a {@link ResultAsync}, throwing an error if it represents a failure.
 *
 * @param result - A {@link ResultAsync}
 * @returns The success value if present
 * @throws An {@link Err} if the {@link Result} contains an error
 *
 * @example
 * ```typescript
 * const value = await unsafe(someSafeAsyncFunction());
 * // If someSafeAsyncFunction() returns an error, the error will be thrown
 * ```
 *
 * @group Async
 */
export const unsafeAsync = async <T, E extends string>(
  result: ResultAsync<T, E>,
): Promise<T> => {
  const [error, value] = await result;
  if (error) {
    throw error;
  }
  return value;
};

/**
 * Wraps an async function that may throw into a function that returns a {@link ResultAsync}.
 *
 * @param fn - The async function to wrap that may throw an error
 * @param label - A label to identify the error when the function throws
 * @returns A function that returns a {@link ResultAsync}
 *
 * @example
 * ```typescript
 * const safeFetch = fromAsyncThrowable(fetch, 'FETCH_ERROR');
 * const success = await safeFetch('https://api.example.com/data'); // [null, data]
 * const fail = await safeFetch('invalid-url'); // [Err<'FETCH_ERROR'>, undefined]
 * ```
 *
 * @group Async
 */
export const fromAsyncThrowable = <A extends any[], T, E extends string>(
  fn: (...args: A) => Promise<T>,
  label: E,
): ResultAsyncFn<A, T, E> => {
  return async (...args: A): ResultAsync<T, E> => {
    return await safeAsync(fn(...args), label);
  };
};
