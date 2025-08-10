/* eslint-disable @typescript-eslint/no-explicit-any */
import { Err, ok } from "./result";
import { Result, ResultFn } from "./types";

/**
 * Wraps a function in a `try-catch` block to safely execute it and returns a {@link Result}.
 *
 * @param fn - The function to execute safely.
 * @param label - The error label to use if the function throws an error.
 * @param onErr - Optional callback to handle the error.
 * @returns A {@link Result} containing either the success value or a structured error.
 *
 * @example
 * ```typescript
 * const [error, value] = safe(() => JSON.parse('{"foo": "bar"}'), 'json_parse_error');
 * if (error) {
 *   console.error(error.source);
 * } else {
 *   console.log(value);
 * }
 * ```
 *
 * @group Sync
 */
export function safe<T, E extends string>(
  fn: () => T,
  label: E,
  onErr?: (err: Err<E, unknown>) => void,
): Result<T, E, unknown> {
  try {
    return ok(fn());
  } catch (error) {
    return new Err(label, error).tap(onErr).result();
  }
}

/**
 * Extracts the successful value from a {@link Result}, or throws the error if it's a failure.
 *
 * @param result - The {@link Result} to process.
 * @param onErr - Optional callback to handle the error.
 * @returns The success value if the result is successful.
 * @throws The {@link Err} object if the result is a failure.
 *
 * @example
 * ```typescript
 * const result = someSafeFunction();
 * const value = unsafe(result); // Throws if result is an error
 * ```
 *
 * @group Sync
 */
export function unsafe<T, E extends string>(
  result: Result<T, E>,
  onErr?: (err: Err<E, unknown>) => void,
): T {
  const [err, value] = result;
  if (err) {
    err.tap(onErr);
    throw err.source;
  }
  return value;
}

/**
 * Converts a function that may throw an error into a function that returns a {@link Result}.
 *
 * @param fn - The function that may throw an error.
 * @param label - The error label to use if the function throws.
 * @param onErr - Optional callback to handle the error.
 * @returns A new function that wraps the original function and returns a {@link Result}.
 *
 * @example
 * ```typescript
 * const safeJsonParse = fromThrowable(JSON.parse, 'json_parse_error');
 * const [error, data] = safeJsonParse('{"key": "value"}');
 * if (error) {
 *   // Handle parsing error
 * } else {
 *   // Use data
 * }
 * ```
 *
 * @group Sync
 */
export function fromThrowable<A extends any[], T, E extends string>(
  fn: (...args: A) => T,
  label: E,
  onErr?: (err: Err<E, unknown>) => void,
): ResultFn<A, T, E, unknown> {
  return (...args: A): Result<T, E, unknown> => {
    return safe(() => fn(...args), label, onErr);
  };
}
