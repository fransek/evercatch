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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResultFn<F extends (...args: any[]) => any, E> = (
  ...args: Parameters<F>
) => Result<ReturnType<F>, E>;

/**
 * Represents an asynchronous function that returns a ResultAsync.
 * @template F The async function type.
 * @template E The type of the error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResultAsyncFn<F extends (...args: any[]) => Promise<any>, E> = (
  ...args: Parameters<F>
) => ResultAsync<Awaited<ReturnType<F>>, E>;

/**
 * Options for error handling.
 * @template E The type of the error.
 */
export type ResultOptions<E = Error> = {
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
