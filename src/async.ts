import { defaultMapErr, err, ok } from "./shared";
import { unwrapOr, unwrapOrElse, unwrapOrThrow } from "./sync";
import type { NonNullishError, ResultAsync, ResultAsyncFn } from "./types";

/**
 * Safely awaits a promise, catching any errors.
 * @group Async
 * @template T The resolved type of the promise.
 * @template E The type of the error.
 * @param promise The promise to await.
 * @param mapErr A function to map errors to a specific type.
 * @returns A Promise of a Result containing either the resolved value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = await fromAsync(
 *   fetch("https://api.example.com/data").then((res) => res.json()),
 * );
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export async function fromAsync<T, E extends NonNullishError<E> = Error>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E = defaultMapErr,
): ResultAsync<T, E> {
  try {
    return ok(await promise);
  } catch (error) {
    return err(mapErr(error));
  }
}

/**
 * Wraps an async function to return a ResultAsync instead of throwing errors.
 * @group Async
 * @template F The async function type.
 * @template E The type of the error.
 * @param fn The async function to wrap.
 * @param mapErr A function to map errors to a specific type.
 * @returns An async function that returns a ResultAsync.
 * @example
 * ```typescript
 * const safeFetch = fromThrowableAsync(fetch);
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
export function fromThrowableAsync<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
  E extends NonNullishError<E> = Error,
>(fn: F, mapErr: (error: unknown) => E = defaultMapErr): ResultAsyncFn<F, E> {
  return async (...args) => {
    return await fromAsync(fn(...args), mapErr);
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
 * const value = await unwrapOrThrowAsync(result);
 * console.log(value);
 * ```
 */
export async function unwrapOrThrowAsync<
  T,
  E extends NonNullishError<E> = Error,
>(resultAsync: ResultAsync<T, E>): Promise<T> {
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
 * const value = await unwrapOrAsync(Promise.resolve(ok(42)), 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = await unwrapOrAsync(
 *   Promise.resolve(err(new Error("Oops"))),
 *   0,
 * );
 * console.log(value); // 0
 * ```
 */
export async function unwrapOrAsync<T, E extends NonNullishError<E> = Error>(
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
 * @param getFallback A function that receives the error and returns a fallback value.
 * @returns A promise that resolves to the unwrapped value or the computed fallback.
 * @example
 * ```typescript
 * const value = await unwrapOrElseAsync(Promise.resolve(ok(42)), () => 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = await unwrapOrElseAsync(
 *   Promise.resolve(err(new Error("Oops"))),
 *   (error) => error.message.length,
 * );
 * console.log(value); // 4
 * ```
 */
export async function unwrapOrElseAsync<
  T,
  E extends NonNullishError<E> = Error,
>(resultAsync: ResultAsync<T, E>, getFallback: (error: E) => T): Promise<T> {
  const result = await resultAsync;
  return unwrapOrElse(result, getFallback);
}

/**
 * Awaits a promise, returning a fallback value if it rejects.
 *
 * Shorthand for `unwrapOrAsync(fromAsync(promise), fallback)`, with an
 * optional hook to observe the error, for logging or reporting, before it is
 * discarded.
 *
 * Anything rejected that isn't an `Error` is wrapped in one, with the original
 * value kept as `cause`, just as {@link fromAsync} does.
 * @group Async
 * @template T The resolved type of the promise.
 * @param promise The promise to await.
 * @param fallback The value to return when the promise rejects.
 * @param tapErr A function called with the error when the promise rejects.
 * @returns A promise that resolves to the resolved value or the fallback.
 * @example
 * ```typescript
 * const users = await tryOrAsync(fetchUsers(), []);
 * ```
 * @example
 * ```typescript
 * const users = await tryOrAsync(fetchUsers(), [], (error) =>
 *   console.warn("Failed to fetch users", error),
 * );
 * ```
 */
export async function tryOrAsync<T>(
  promise: Promise<T>,
  fallback: T,
  tapErr?: (error: Error) => void,
): Promise<T> {
  return unwrapOrElseAsync(fromAsync(promise), (error) => {
    tapErr?.(error);
    return fallback;
  });
}

/**
 * Awaits a promise, computing a fallback value from the error if it rejects.
 *
 * Shorthand for `unwrapOrElseAsync(fromAsync(promise), getFallback)`.
 *
 * Anything rejected that isn't an `Error` is wrapped in one, with the original
 * value kept as `cause`, just as {@link fromAsync} does.
 * @group Async
 * @template T The resolved type of the promise.
 * @param promise The promise to await.
 * @param getFallback A function that receives the error and returns a fallback value.
 * @returns A promise that resolves to the resolved value or the computed fallback.
 * @example
 * ```typescript
 * const users = await tryOrElseAsync(fetchUsers(), (error) =>
 *   error.name === "AbortError" ? [] : cachedUsers,
 * );
 * ```
 */
export async function tryOrElseAsync<T>(
  promise: Promise<T>,
  getFallback: (error: Error) => T,
): Promise<T> {
  return unwrapOrElseAsync(fromAsync(promise), getFallback);
}

/**
 * Awaits a promise, rethrowing any rejection through `mapErr`.
 *
 * Shorthand for `unwrapOrThrowAsync(fromAsync(promise, mapErr))`. Useful for
 * turning whatever a promise rejects with into an error of your own before it
 * propagates.
 *
 * Without `mapErr`, anything rejected that isn't an `Error` is wrapped in one,
 * with the original value kept as `cause`, just as {@link fromAsync} does.
 * @group Async
 * @template T The resolved type of the promise.
 * @template E The type of the thrown error.
 * @param promise The promise to await.
 * @param mapErr A function to map errors to a specific type before throwing.
 * @returns A promise that resolves to the resolved value.
 * @throws The mapped error if the promise rejects.
 * @example
 * ```typescript
 * const users = await tryOrThrowAsync(
 *   fetchUsers(),
 *   (error) => new ApiError("Failed to fetch users", { cause: error }),
 * );
 * ```
 */
export async function tryOrThrowAsync<T, E extends NonNullishError<E> = Error>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E = defaultMapErr,
): Promise<T> {
  return unwrapOrThrowAsync(fromAsync(promise, mapErr));
}
