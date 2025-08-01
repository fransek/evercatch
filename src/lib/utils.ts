/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, ok } from "./result";
import { Result, ResultFn } from "./types";

/**
 * Wraps a function in a `try-catch` block to safely execute it and returns a {@link Result}.
 *
 * @param fn - The function to execute safely.
 * @param label - The error label to use if the function throws an error.
 * @returns A {@link Result} containing either the success value or a structured error.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 *
 * @example
 * ```typescript
 * const [error, value] = safe(() => JSON.parse('{"foo": "bar"}'), 'JSON_PARSE_ERROR');
 * if (error) {
 *   console.error(error.source);
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
): Result<T, E, unknown> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(label, { source: error });
  }
};

/**
 * Extracts the successful value from a {@link Result}, or throws the error if it's a failure.
 *
 * @param result - The {@link Result} to process.
 * @returns The success value if the result is successful.
 * @throws The {@link Err} object if the result is a failure.
 * @template T - The type of the success value.
 * @template E - A string literal type for the error label.
 *
 * @example
 * ```typescript
 * const result = someSafeFunction();
 * try {
 *   const value = unsafe(result);
 *   console.log('Success:', value);
 * } catch (error) {
 *   console.error(error.source);
 * }
 * ```
 *
 * @group Sync
 */
export const unsafe = <T, E extends string>(result: Result<T, E>): T => {
  const [error, value] = result;
  if (error) {
    throw error.source;
  }
  return value;
};

/**
 * Converts a function that may throw an error into a function that returns a {@link Result}.
 *
 * @param fn - The function that may throw an error.
 * @param label - The error label to use if the function throws.
 * @returns A new function that wraps the original function and returns a {@link Result}.
 * @template A - The arguments of the function.
 * @template T - The return type of the function.
 * @template E - A string literal type for the error label.
 *
 * @example
 * ```typescript
 * const safeJsonParse = fromThrowable(JSON.parse, 'JSON_PARSE_ERROR');
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
export const fromThrowable = <A extends any[], T, E extends string>(
  fn: (...args: A) => T,
  label: E,
): ResultFn<A, T, E, unknown> => {
  return (...args: A): Result<T, E, unknown> => {
    return safe(() => fn(...args), label);
  };
};
