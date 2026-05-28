/** @internal */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;
/** @internal */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Represents a successful result containing a value.
 * @template T The type of the value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents an error result containing an error.
 * @template E The type of the error.
 */
export type ResultErr<E> = readonly [E, null];

/**
 * Represents a result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure.
 */
export type Result<T, E> = ResultOk<T> | ResultErr<E>;

/**
 * Represents an asynchronous result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure.
 */
export type ResultAsync<T, E> = Promise<Result<T, E>>;

/**
 * Represents a function that returns a Result.
 * @template F The function type.
 * @template E The type of the error.
 */
export type ResultFn<F extends AnyFunction, E> = (
  ...args: Parameters<F>
) => Result<ReturnType<F>, E>;

/**
 * Represents an asynchronous function that returns a ResultAsync.
 * @template F The async function type.
 * @template E The type of the error.
 */
export type ResultAsyncFn<F extends AnyAsyncFunction, E> = (
  ...args: Parameters<F>
) => ResultAsync<Awaited<ReturnType<F>>, E>;

/**
 * Options for error handling.
 * @template E The type of the error.
 */
export type Options<E = Error> = {
  /** Function to transform the caught error. */
  mapErr?: (err: unknown) => E;
  /** Callback to handle the error. */
  tapErr?: (err: E) => void;
  /**
   * @deprecated Use `mapErr` instead.
   */
  transformError?: (err: unknown) => E;
  /**
   * @deprecated Use `tapErr` instead.
   */
  onError?: (err: E) => void;
};

/**
 * Creates a successful result with the given value.
 * @template T The type of the value.
 * @param value The value to wrap in a successful result. Defaults to null if not provided.
 * @returns A ResultOk containing the value.
 * @example
 * ```typescript
 * const [error, value] = ok("Success"); // [null, "Success"]
 * ```
 * @example
 * ```typescript
 * const [error, value] = ok(); // [null, null]
 * ```
 */
export function ok<T = null>(value?: T): ResultOk<T> {
  return [null, value ?? (null as T)] as const;
}

/**
 * Creates an error result with the given error.
 * @template E The type of the error.
 * @param error The error to wrap in an error result. Defaults to a new Error if not provided.
 * @returns A ResultErr containing the error.
 * @example
 * ```typescript
 * const [error, value] = err(new Error("Oops")); // [Error: Oops, null]
 * ```
 * @example
 * ```typescript
 * const [error, value] = err(); // [Error, null]
 * ```
 */
export function err<E = Error>(error?: E): ResultErr<E> {
  return [error ?? (new Error() as E), null] as const;
}

function processError<E = Error>(
  error: unknown,
  mapErr?: (err: unknown) => E,
): E {
  if (mapErr) {
    return mapErr(error);
  }
  if (error instanceof Error) {
    return error as E;
  }
  return new Error(undefined, { cause: error }) as E;
}

function handleError<E = Error>(
  error: unknown,
  { tapErr, mapErr, onError, transformError }: Options<E> = {},
): ResultErr<E> {
  const mappedErr = processError(error, mapErr ?? transformError);
  (tapErr ?? onError)?.(mappedErr);
  return err(mappedErr);
}

/**
 * Safely executes a function, catching any errors.
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param options Options for error handling.
 * @returns A Result containing either the function's return value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = resultFrom(() => JSON.parse('{"foo": "bar"}'));
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 */
export function resultFrom<T, E = Error>(
  fn: () => T,
  options?: Options<E>,
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Safely awaits a promise, catching any errors.
 * @template T The resolved type of the promise.
 * @template E The type of the error.
 * @param promise The promise to await.
 * @param options Options for error handling.
 * @returns A Promise of a Result containing either the resolved value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = await resultFromPromise(
 *   fetch("https://api.example.com/data").then((res) => res.json()),
 * );
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export async function resultFromPromise<T, E = Error>(
  promise: Promise<T>,
  options?: Options<E>,
): ResultAsync<T, E> {
  try {
    return ok(await promise);
  } catch (error) {
    return handleError(error, options);
  }
}

/**
 * Wraps a function to return a Result instead of throwing errors.
 * @template F The function type.
 * @template E The type of the error.
 * @param fn The function to wrap.
 * @param options Options for error handling.
 * @returns A function that returns a Result.
 * @example
 * ```typescript
 * const safeParse = fromThrowable(JSON.parse);
 *
 * const [error, data] = safeParse('{"foo": "bar"}');
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export function fromThrowable<F extends AnyFunction, E = Error>(
  fn: F,
  options?: Options<E>,
): ResultFn<F, E> {
  return (...args) => {
    return resultFrom(() => fn(...args), options);
  };
}

/**
 * Wraps an async function to return a ResultAsync instead of throwing errors.
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
export function fromAsyncThrowable<F extends AnyAsyncFunction, E = Error>(
  fn: F,
  options?: Options<E>,
): ResultAsyncFn<F, E> {
  return async (...args) => {
    return await resultFromPromise(fn(...args), options);
  };
}

/**
 * Unwraps a Result, throwing the error if it exists.
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @returns The unwrapped value.
 * @throws The error if the result contains an error.
 * @example
 * ```typescript
 * const result = someFunctionThatReturnsResult();
 * const value = unwrapOrThrow(result);
 * console.log(value);
 * ```
 */
export function unwrapOrThrow<T, E = Error>(result: Result<T, E>): T {
  const [error, value] = result;
  if (error) {
    throw error;
  }
  return value as T;
}

/**
 * Unwraps a ResultAsync, throwing the error if it exists.
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
 * Unwraps a Result, returning a fallback value if it contains an error.
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @param fallback The value to return when the result contains an error.
 * @returns The unwrapped value or the fallback.
 * @example
 * ```typescript
 * const value = unwrapOr(ok(42), 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = unwrapOr(err(new Error("Oops")), 0);
 * console.log(value); // 0
 * ```
 */
export function unwrapOr<T, E = Error>(result: Result<T, E>, fallback: T): T {
  const [error, value] = result;
  if (error) {
    return fallback;
  }
  return value as T;
}

/**
 * Unwraps a ResultAsync, returning a fallback value if it contains an error.
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
 * Unwraps a Result, computing a fallback value from the error when needed.
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The Result to unwrap.
 * @param fallbackFn A function that receives the error and returns a fallback value.
 * @returns The unwrapped value or the computed fallback.
 * @example
 * ```typescript
 * const value = unwrapOrElse(ok(42), () => 0);
 * console.log(value); // 42
 * ```
 * @example
 * ```typescript
 * const value = unwrapOrElse(
 *   err(new Error("Oops")),
 *   (error) => error.message.length,
 * );
 * console.log(value); // 4
 * ```
 */
export function unwrapOrElse<T, E = Error>(
  result: Result<T, E>,
  fallbackFn: (err: E) => T,
): T {
  const [error, value] = result;
  if (error) {
    return fallbackFn(error);
  }
  return value as T;
}

/**
 * Unwraps a ResultAsync, computing a fallback value from the error when needed.
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

/**
 * @deprecated Use `resultFrom` instead.
 */
export const safe = resultFrom;

/**
 * @deprecated Use `resultFromPromise` instead.
 */
export const safeAsync = resultFromPromise;

/**
 * @deprecated Use `unwrapOrThrow` instead.
 */
export const unsafeUnwrap = unwrapOrThrow;

/**
 * @deprecated Use `unwrapAsyncOrThrow` instead.
 */
export const unsafeUnwrapAsync = unwrapAsyncOrThrow;
