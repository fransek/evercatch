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
  transformError?: (err: unknown) => E;
  /** Callback to handle the error. */
  onError?: (err: E) => void;
};

/**
 * Creates a successful result with the given value.
 * @template T The type of the value.
 * @param value The value to wrap in a successful result. Defaults to null if not provided.
 * @returns A ResultOk containing the value.
 */
export function ok<T = null>(value?: T): ResultOk<T> {
  return [null, value ?? (null as T)] as const;
}

/**
 * Creates an error result with the given error.
 * @template E The type of the error.
 * @param error The error to wrap in an error result. Defaults to a new Error if not provided.
 * @returns A ResultErr containing the error.
 */
export function err<E = Error>(error?: E): ResultErr<E> {
  return [error ?? (new Error() as E), null] as const;
}

function processError<E = Error>(
  error: unknown,
  transformError?: (err: unknown) => E,
): E {
  if (transformError) {
    return transformError(error);
  }
  if (error instanceof Error) {
    return error as E;
  }
  return new Error(String(error), { cause: error }) as E;
}

function handleError<T, E = Error>(
  error: unknown,
  { onError, transformError }: Options<E> = {},
): Result<T, E> {
  const transformed = processError(error, transformError);
  onError?.(transformed);
  return err(transformed);
}

/**
 * Safely executes a function, catching any errors.
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param options Options for error handling.
 * @returns A Result containing either the function's return value or the caught error.
 */
export function safe<T, E = Error>(
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
 */
export async function safeAsync<T, E = Error>(
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
 */
export function fromThrowable<F extends AnyFunction, E = Error>(
  fn: F,
  options?: Options<E>,
): ResultFn<F, E> {
  return (...args) => {
    return safe(() => fn(...args), options);
  };
}

/**
 * Wraps an async function to return a ResultAsync instead of throwing errors.
 * @template F The async function type.
 * @template E The type of the error.
 * @param fn The async function to wrap.
 * @param options Options for error handling.
 * @returns An async function that returns a ResultAsync.
 */
export function fromAsyncThrowable<F extends AnyAsyncFunction, E = Error>(
  fn: F,
  options?: Options<E>,
): ResultAsyncFn<F, E> {
  return async (...args) => {
    return await safeAsync(fn(...args), options);
  };
}
