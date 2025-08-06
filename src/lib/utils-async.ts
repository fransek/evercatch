/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, ok } from "./result";
import { ResultAsync, ResultAsyncFn } from "./types";

/**
 * Wraps a `Promise` in a `try-catch` block to safely execute it and returns a {@link ResultAsync}.
 *
 * @param promise - The promise to execute safely.
 * @param label - The error label to use if the promise rejects.
 * @returns A {@link ResultAsync} containing either the success value or a structured error.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
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
): ResultAsync<T, E, unknown> {
  try {
    return ok(await promise);
  } catch (error) {
    return err(label, { source: error });
  }
}

/**
 * Extracts the successful value from a {@link ResultAsync}, or throws the error if it's a failure.
 *
 * @param result - The {@link ResultAsync} to process.
 * @returns A `Promise` that resolves with the success value.
 * @throws The {@link Err} object if the result is a failure.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
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
): Promise<T> {
  const [error, value] = await result;
  if (error) {
    throw error;
  }
  return value;
}

/**
 * Converts an async function that may throw an error into a function that returns a {@link ResultAsync}.
 *
 * @param fn - The async function that may throw an error.
 * @param label - The error label to use if the function throws.
 * @returns A new async function that wraps the original function and returns a {@link ResultAsync}.
 * @template A - The arguments of the function.
 * @template T - The return type of the function.
 * @template E - A string literal type for the error label.
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
): ResultAsyncFn<A, T, E, unknown> {
  return async (...args: A): ResultAsync<T, E, unknown> => {
    return await safeAsync(fn(...args), label);
  };
}
