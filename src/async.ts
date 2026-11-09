import { TimeoutError } from "./errors";
import { defaultErrorMapper, err, isErr, ok } from "./shared";
import type { OkValues } from "./sync";
import { all, collect, unwrapOr, unwrapOrElse, unwrapOrThrow } from "./sync";
import type {
  ErrOf,
  NotNullish,
  Result,
  ResultAsync,
  ResultAsyncFn,
  ResultErr,
  UncheckedResult,
} from "./types";

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
export async function fromPromise<T, E extends NotNullish<E> = Error>(
  promise: Promise<T>,
  mapErr: (err: unknown) => E = defaultErrorMapper,
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
  E extends NotNullish<E> = Error,
>(
  fn: F,
  mapErr: (err: unknown) => E = defaultErrorMapper,
): ResultAsyncFn<F, E> {
  return async (...args) => {
    return await fromPromise(fn(...args), mapErr);
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
export async function unwrapAsyncOrThrow<T, E extends NotNullish<E> = Error>(
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
export async function unwrapAsyncOr<T, E extends NotNullish<E> = Error>(
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
export async function unwrapAsyncOrElse<T, E extends NotNullish<E> = Error>(
  resultAsync: ResultAsync<T, E>,
  fallbackFn: (err: E) => T,
): Promise<T> {
  const result = await resultAsync;
  return unwrapOrElse(result, fallbackFn);
}

/**
 * Transforms the value of an async result, passing errors through untouched.
 * The function can be async.
 * @group Async
 * @template T The type of the value.
 * @template U The type of the transformed value.
 * @template E The type of the error.
 * @param resultAsync The async result to transform.
 * @param fn A function that receives the value and returns a new one.
 * @returns A promise of a result holding the transformed value, or the original error.
 * @example
 * ```typescript
 * const [error, data] = await mapAsync(
 *   fromPromise(fetch(url)),
 *   (response) => response.json(),
 * );
 * ```
 */
export async function mapAsync<T, U, E extends NotNullish<E>>(
  resultAsync: ResultAsync<T, E>,
  fn: (value: T) => U | Promise<U>,
): ResultAsync<U, E> {
  const result = await resultAsync;
  if (isErr(result)) {
    return result;
  }
  return ok(await fn(result[1]));
}

/**
 * Transforms the error of an async result, passing ok results through
 * untouched. The function can be async.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @template F The type of the transformed error. Cannot be nullish.
 * @param resultAsync The async result to transform.
 * @param fn A function that receives the error and returns a new one.
 * @returns A promise of a result holding the original value, or the transformed error.
 * @example
 * ```typescript
 * const [error] = await mapErrAsync(
 *   fromPromise(fetch(url)),
 *   () => "NETWORK_ERROR" as const,
 * );
 * ```
 */
export async function mapErrAsync<
  T,
  E extends NotNullish<E>,
  F extends NotNullish<F>,
>(
  resultAsync: ResultAsync<T, E>,
  fn: (error: E) => F | Promise<F>,
): ResultAsync<T, F> {
  const result = await resultAsync;
  if (isErr(result)) {
    return err(await fn(result[0]));
  }
  return result;
}

/**
 * Chains a function that returns a result, or an async result, onto an
 * async result. Errors short circuit, so the function only runs when the
 * result is ok.
 * @group Async
 * @template T The type of the value.
 * @template U The type of the value returned by the function.
 * @template E The type of the error.
 * @template F The type of the error returned by the function.
 * @param resultAsync The async result to chain onto.
 * @param fn A function that receives the value and returns a new result.
 * @returns A promise of the result returned by the function, or the original error.
 * @example
 * ```typescript
 * const [error, user] = await andThenAsync(authenticate(), (session) =>
 *   fetchUser(session.userId),
 * );
 * ```
 */
export async function andThenAsync<
  T,
  U,
  E extends NotNullish<E>,
  F extends NotNullish<F>,
>(
  resultAsync: ResultAsync<T, E>,
  fn: (value: T) => Result<U, F> | ResultAsync<U, F>,
): ResultAsync<U, E | F> {
  const result = await resultAsync;
  if (isErr(result)) {
    return result;
  }
  return await fn(result[1]);
}

/**
 * Recovers from an error by calling a function that returns a new result, or
 * an async result. Ok results pass through untouched.
 * @group Async
 * @template T The type of the value.
 * @template U The type of the value returned by the function.
 * @template E The type of the error.
 * @template F The type of the error returned by the function.
 * @param resultAsync The async result to recover.
 * @param fn A function that receives the error and returns a new result.
 * @returns A promise of the original ok result, or the result returned by the function.
 * @example
 * ```typescript
 * const [error, user] = await orElseAsync(fetchUser(id), () =>
 *   fetchCachedUser(id),
 * );
 * ```
 */
export async function orElseAsync<
  T,
  U,
  E extends NotNullish<E>,
  F extends NotNullish<F>,
>(
  resultAsync: ResultAsync<T, E>,
  fn: (error: E) => Result<U, F> | ResultAsync<U, F>,
): ResultAsync<T | U, F> {
  const result = await resultAsync;
  if (isErr(result)) {
    return await fn(result[0]);
  }
  return result;
}

/**
 * Calls a function with the value of an ok async result, for side effects
 * such as logging, and returns the result unchanged. An async function is
 * awaited before the result is returned.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The async result to inspect.
 * @param fn A function that receives the value. Its return value is ignored.
 * @returns A promise of the same result.
 * @example
 * ```typescript
 * const result = await tapAsync(fetchUser(id), (user) => audit(user.id));
 * ```
 */
export async function tapAsync<T, E extends NotNullish<E>>(
  resultAsync: ResultAsync<T, E>,
  fn: (value: T) => unknown,
): ResultAsync<T, E> {
  const result = await resultAsync;
  if (!isErr(result)) {
    await fn(result[1]);
  }
  return result;
}

/**
 * Calls a function with the error of an async error result, for side effects
 * such as logging, and returns the result unchanged. An async function is
 * awaited before the result is returned.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The async result to inspect.
 * @param fn A function that receives the error. Its return value is ignored.
 * @returns A promise of the same result.
 * @example
 * ```typescript
 * const result = await tapErrAsync(fetchUser(id), (error) => report(error));
 * ```
 */
export async function tapErrAsync<T, E extends NotNullish<E>>(
  resultAsync: ResultAsync<T, E>,
  fn: (error: E) => unknown,
): ResultAsync<T, E> {
  const result = await resultAsync;
  if (isErr(result)) {
    await fn(result[0]);
  }
  return result;
}

/**
 * Handles both outcomes of an async result in a single expression. The
 * handlers can be async.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @template A The type returned by the `ok` handler.
 * @template B The type returned by the `err` handler.
 * @param resultAsync The async result to match on.
 * @param handlers One handler for the value and one for the error.
 * @returns A promise of whatever the matching handler returns.
 * @example
 * ```typescript
 * const status = await matchAsync(fetchUser(id), {
 *   ok: (user) => `Hello, ${user.name}`,
 *   err: () => "Please sign in",
 * });
 * ```
 */
export async function matchAsync<T, E extends NotNullish<E>, A, B = A>(
  resultAsync: ResultAsync<T, E>,
  handlers: {
    ok: (value: T) => A | Promise<A>;
    err: (error: E) => B | Promise<B>;
  },
): Promise<A | B> {
  const result = await resultAsync;
  if (isErr(result)) {
    return await handlers.err(result[0]);
  }
  return await handlers.ok(result[1]);
}

/** @internal */
export type MaybeAsyncResult =
  | Result<unknown, unknown>
  | ResultAsync<unknown, unknown>;

/**
 * Combines several async results into one, waiting for all of them. If every
 * result is ok, the combined result holds all of their values in order.
 * Otherwise it holds the first error, in input order.
 *
 * Plain results can be mixed in, and tuples keep their shape.
 * @group Async
 * @template R The tuple or array of results or async results.
 * @param results The results to combine.
 * @returns A promise of a result holding every value, or the first error.
 * @example
 * ```typescript
 * const [error, values] = await allAsync([fetchUser(id), fetchPosts(id)]);
 * if (!error) {
 *   const [user, posts] = values;
 * }
 * ```
 */
export async function allAsync<const R extends readonly MaybeAsyncResult[]>(
  results: R,
): Promise<UncheckedResult<OkValues<R>, ErrOf<Awaited<R[number]>>>> {
  return all(await Promise.all(results)) as UncheckedResult<
    OkValues<R>,
    ErrOf<Awaited<R[number]>>
  >;
}

/**
 * Combines several async results into one, waiting for all of them and
 * collecting every error instead of stopping at the first.
 *
 * If every result is ok, the combined result holds all of their values in
 * order, like {@link allAsync}. Otherwise it holds an array of every error,
 * in input order.
 * @group Async
 * @template R The tuple or array of results or async results.
 * @param results The results to combine.
 * @returns A promise of a result holding every value, or every error.
 * @example
 * ```typescript
 * const [errors, values] = await collectAsync(ids.map(fetchUser));
 * ```
 */
export async function collectAsync<const R extends readonly MaybeAsyncResult[]>(
  results: R,
): Promise<UncheckedResult<OkValues<R>, ErrOf<Awaited<R[number]>>[]>> {
  return collect(await Promise.all(results)) as UncheckedResult<
    OkValues<R>,
    ErrOf<Awaited<R[number]>>[]
  >;
}

/**
 * The helper passed to a {@link genAsync} callback. `yield*` it with a
 * result, or an async result, to get the value, or to return the error from
 * the whole block.
 */
export type UnwrapAsync = <T, E extends NotNullish<E>>(
  result: Result<T, E> | ResultAsync<T, E>,
) => AsyncGenerator<ResultErr<E>, T, unknown>;

async function* unwrapStepAsync<T, E extends NotNullish<E>>(
  resultAsync: Result<T, E> | ResultAsync<T, E>,
): AsyncGenerator<ResultErr<E>, T, unknown> {
  const result = await resultAsync;
  if (isErr(result)) {
    yield result;
  }
  return result[1] as T;
}

/**
 * The async version of {@link gen}. Every `yield* $(result)` either produces
 * the value of an ok result, or stops the block and returns the error. `$`
 * takes both results and async results.
 *
 * Whatever the block returns becomes the value of an ok result. The error
 * type is the union of every error that can be yielded. `finally` blocks
 * inside the generator run when it stops early.
 *
 * Errors thrown inside the block are not caught. Wrap code that might throw
 * with {@link fromPromise} first.
 * @group Async
 * @template Y The error results that can be yielded.
 * @template T The type of the value returned by the block.
 * @param fn An async generator function that receives the `$` helper.
 * @returns A promise of a result holding the returned value, or the first yielded error.
 * @example
 * ```typescript
 * const [error, profile] = await genAsync(async function* ($) {
 *   const session = yield* $(authenticate());
 *   const user = yield* $(fetchUser(session.userId));
 *   return user.profile;
 * });
 * ```
 */
export async function genAsync<Y extends ResultErr<unknown>, T>(
  fn: ($: UnwrapAsync) => AsyncGenerator<Y, T, unknown>,
): Promise<UncheckedResult<T, ErrOf<Y>>> {
  const iterator = fn(unwrapStepAsync);
  const step = await iterator.next();
  if (step.done) {
    return ok(step.value);
  }
  await iterator.return(undefined as T);
  return step.value as readonly [ErrOf<Y>, null];
}

/**
 * Options for {@link retry}.
 * @template E The type of the error.
 */
export interface RetryOptions<E> {
  /** How many times to call the function in total. Defaults to 3. */
  attempts?: number;
  /**
   * How long to wait between attempts, in milliseconds. Pass a function for
   * a backoff that depends on the attempt that just failed. Defaults to 0.
   */
  delay?: number | ((attempt: number, error: E) => number);
  /**
   * Decides whether an error is worth retrying. Defaults to retrying every
   * error.
   */
  shouldRetry?: (error: E, attempt: number) => boolean;
}

/**
 * Calls a function that returns a result until it succeeds, it runs out of
 * attempts, or `shouldRetry` says no. Returns the last result.
 *
 * The function receives the attempt number, starting at 1. It should return
 * a result rather than throw. Wrap a throwing function with
 * {@link fromAsyncThrowable} first.
 * @group Async
 * @template T The type of the value.
 * @template E The type of the error.
 * @param fn The function to call. Can return a result or an async result.
 * @param options How many attempts to make, how long to wait between them, and which errors to retry.
 * @returns A promise of the first ok result, or the last error.
 * @example
 * ```typescript
 * const safeFetch = fromAsyncThrowable(fetch);
 *
 * const [error, response] = await retry(() => safeFetch(url), {
 *   attempts: 5,
 *   delay: (attempt) => 100 * 2 ** attempt,
 *   shouldRetry: (error) => error.name !== "AbortError",
 * });
 * ```
 */
export async function retry<T, E extends NotNullish<E>>(
  fn: (attempt: number) => Result<T, E> | ResultAsync<T, E>,
  options: RetryOptions<E> = {},
): ResultAsync<T, E> {
  const { attempts = 3, delay = 0, shouldRetry = () => true } = options;
  for (let attempt = 1; ; attempt++) {
    const result = await fn(attempt);
    if (
      !isErr(result) ||
      attempt >= attempts ||
      !shouldRetry(result[0], attempt)
    ) {
      return result;
    }
    const ms = typeof delay === "function" ? delay(attempt, result[0]) : delay;
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}

/**
 * Runs an async function with a time limit. If it takes longer than `ms`,
 * the result holds a {@link TimeoutError}, and the signal passed to the
 * function is aborted, so work like a `fetch` can be cancelled.
 *
 * Errors thrown by the function are caught, like with {@link fromPromise}.
 * @group Async
 * @template T The resolved type of the function.
 * @template E The type of the error.
 * @param fn The async function to run. Receives an AbortSignal.
 * @param ms The time limit, in milliseconds.
 * @param mapErr A function to map errors thrown by `fn` to a specific type.
 * @returns A promise of a result holding the value, the caught error, or a TimeoutError.
 * @example
 * ```typescript
 * const [error, response] = await withTimeout(
 *   (signal) => fetch(url, { signal }),
 *   5000,
 * );
 *
 * if (error instanceof TimeoutError) {
 *   // ...
 * }
 * ```
 */
export async function withTimeout<T, E extends NotNullish<E> = Error>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  mapErr: (err: unknown) => E = defaultErrorMapper,
): Promise<UncheckedResult<T, E | TimeoutError>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ResultErr<TimeoutError>>((resolve) => {
    timer = setTimeout(() => {
      const error = new TimeoutError(ms);
      controller.abort(error);
      resolve(err(error));
    }, ms);
  });
  try {
    return await Promise.race([
      fromPromise(
        new Promise<T>((resolve) => resolve(fn(controller.signal))),
        mapErr,
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
