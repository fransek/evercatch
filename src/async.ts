import { handleError, ok } from "./shared";
import { unwrapOr, unwrapOrElse, unwrapOrThrow } from "./sync";
import type { ResultAsync, ResultAsyncFn, ResultOptions } from "./types";

/**
 * Safely awaits a promise, catching any errors.
 * @group Async
 * @template T The resolved type of the promise.
 * @template E The type of the error.
 * @param promise The promise to await.
 * @param options Options for error handling.
 * @returns A Promise of a Result containing either the resolved value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = await fromPromise(
 *   fetch("https://api.example.com/data").then((res) => res.json()),
 * );
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  options?: ResultOptions<E>,
): ResultAsync<T, E> {
  try {
    return ok(await promise);
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Wraps an async function to return a ResultAsync instead of throwing errors.
 * @group Async
 * @template F The async function type.
 * @template E The type of the error.
 * @param fn The async function to wrap.
 * @param options Options for error handling.
 * @returns An async function that returns a ResultAsync.
 * @example
 * ```typescript
 * const safeFetch = fromAsyncThrowable(fetch);
 *
 * const [error, response] = await safeFetch("https://api.example.com/data");
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   const data = await response.json();
 *   console.log(data);
 * }
 * ```
 */
export function fromAsyncThrowable<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
  E = Error,
>(fn: F, options?: ResultOptions<E>): ResultAsyncFn<F, E> {
  return async (...args) => {
    return await fromPromise(fn(...args), options);
  };
}

/**
 * Unwraps a ResultAsync, throwing the error if it exists.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The ResultAsync to unwrap.
 * @returns A promise that resolves to the unwrapped value.
 * @throws The error if the result contains an error.
 * @example
 * ```typescript
 * const result = someAsyncFunctionThatReturnsResult();
 * const value = await unwrapAsyncOrThrow(result);
 * console.log(value);
 * ```
 */
export async function unwrapAsyncOrThrow<T, E = Error>(
  resultAsync: ResultAsync<T, E>,
): Promise<T> {
  const result = await resultAsync;
  return unwrapOrThrow(result);
}

/**
 * Unwraps a ResultAsync, returning a fallback value if it contains an error.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The ResultAsync to unwrap.
 * @param fallback The value to return when the result contains an error.
 * @returns A promise that resolves to the unwrapped value or the fallback.
 * @example
 * ```typescript
 * const value = await unwrapAsyncOr(Promise.resolve(ok(42)), 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = await unwrapAsyncOr(
 *   Promise.resolve(err(new Error("Oops"))),
 *   0,
 * );
 * console.log(value); // 0
 * ```
 */
export async function unwrapAsyncOr<T, E = Error>(
  resultAsync: ResultAsync<T, E>,
  fallback: T,
): Promise<T> {
  const result = await resultAsync;
  return unwrapOr(result, fallback);
}

/**
 * Unwraps a ResultAsync, computing a fallback value from the error when needed.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The ResultAsync to unwrap.
 * @param fallbackFn A function that receives the error and returns a fallback value.
 * @returns A promise that resolves to the unwrapped value or the computed fallback.
 * @example
 * ```typescript
 * const value = await unwrapAsyncOrElse(Promise.resolve(ok(42)), () => 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = await unwrapAsyncOrElse(
 *   Promise.resolve(err(new Error("Oops"))),
 *   (error) => error.message.length,
 * );
 * console.log(value); // 4
 * ```
 */
export async function unwrapAsyncOrElse<T, E = Error>(
  resultAsync: ResultAsync<T, E>,
  fallbackFn: (err: E) => T,
): Promise<T> {
  const result = await resultAsync;
  return unwrapOrElse(result, fallbackFn);
}
