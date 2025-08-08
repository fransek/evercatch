/* eslint-disable @typescript-eslint/no-explicit-any */
import { Err, ok } from "./result";
import { ResultAsync, ResultAsyncFn } from "./types";

/**
 * Wraps a `Promise` in a `try-catch` block to safely execute it and returns a {@link ResultAsync}.
 *
 * @param promise - The promise to execute safely.
 * @param label - The error label to use if the promise rejects.
 * @param onErr - Optional callback to handle the error.
 * @returns A {@link ResultAsync} containing either the success value or a structured error.
 *
 * @example
 * ```typescript
 * const [error, value] = await safeAsync(fetch('https://api.example.com/data'), 'fetch_error');
 * if (error) {
 *   console.error(error.source);
 * } else {
 *   console.log(value);
 * }
 * ```
 *
 * @group Async
 */
export async function safeAsync<T, E extends string = string>(
  promise: Promise<T>,
  label: E,
  onErr?: (err: Err<E, unknown>) => void,
): ResultAsync<T, E, unknown> {
  try {
    return ok(await promise);
  } catch (error) {
    const err = new Err(label, error);
    onErr?.(err);
    return err.result();
  }
}

/**
 * Extracts the successful value from a {@link ResultAsync}, or throws the error if it's a failure.
 *
 * @param result - The {@link ResultAsync} to process.
 * @param onErr - Optional callback to handle the error.
 * @returns A `Promise` that resolves with the success value.
 * @throws The {@link Err} object if the result is a failure.
 *
 * @example
 * ```typescript
 * const result = someSafeAsyncFunction();
 * const value = await unsafeAsync(result); // Throws if result is an error
 * ```
 *
 * @group Async
 */
export async function unsafeAsync<T, E extends string>(
  result: ResultAsync<T, E>,
  onErr?: (err: Err<E, unknown>) => void,
): Promise<T> {
  const [err, value] = await result;
  if (err) {
    onErr?.(err);
    throw err.source;
  }
  return value;
}

/**
 * Converts an async function that may throw an error into a function that returns a {@link ResultAsync}.
 *
 * @param fn - The async function that may throw an error.
 * @param label - The error label to use if the function throws.
 * @param onErr - Optional callback to handle the error.
 * @returns A new async function that wraps the original function and returns a {@link ResultAsync}.
 *
 * @example
 * ```typescript
 * const safeFetch = fromAsyncThrowable(fetch, 'fetch_error');
 * const [error, response] = await safeFetch('https://api.example.com/data');
 * if (error) {
 *   // Handle fetch error
 * } else {
 *   // Use response
 * }
 * ```
 *
 * @group Async
 */
export function fromAsyncThrowable<A extends any[], T, E extends string>(
  fn: (...args: A) => Promise<T>,
  label: E,
  onErr?: (err: Err<E, unknown>) => void,
): ResultAsyncFn<A, T, E, unknown> {
  return async (...args: A): ResultAsync<T, E, unknown> => {
    return await safeAsync(fn(...args), label, onErr);
  };
}
