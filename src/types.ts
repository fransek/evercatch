/**
 * Constraint that rejects error types that could be nullish.
 *
 * `null` in the error slot means "this result is ok, there is no error", so an
 * error can never be `null`. `undefined` is rejected along with it, since it
 * means "no error was passed" everywhere an error is optional.
 *
 * Every error type in this library is constrained with it. Use it when writing
 * your own generic helpers around {@link Result}.
 *
 * `unknown` is allowed, so an error caught in a `catch` block can be passed on
 * as is. `any` is not, since it resolves to a nullish type here; widen it to
 * `unknown` instead.
 * @template E The type of the error.
 * @example
 * ```typescript
 * function logError<E extends NotNullish<E>>(result: Result<unknown, E>) {
 *   const [error] = result;
 *   if (error) {
 *     console.error(error);
 *   }
 * }
 * ```
 */
export type NotNullish<E> = [Extract<E, null | undefined>] extends [never]
  ? unknown
  : never;

/**
 * Represents a successful result containing a value.
 * @template T The type of the value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents an error result containing an error.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultErr<E extends NotNullish<E>> = readonly [E, null];

/**
 * Represents a result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Cannot be nullish.
 */
export type Result<T, E extends NotNullish<E>> = ResultOk<T> | ResultErr<E>;

/**
 * Represents an asynchronous result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Cannot be nullish.
 */
export type ResultAsync<T, E extends NotNullish<E>> = Promise<Result<T, E>>;

/**
 * Represents a function that returns a Result.
 * @template F The function type.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => any,
  E extends NotNullish<E>,
> = (...args: Parameters<F>) => Result<ReturnType<F>, E>;

/**
 * Represents an asynchronous function that returns a ResultAsync.
 * @template F The async function type.
 * @template E The type of the error. Cannot be nullish.
 */
export type ResultAsyncFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
  E extends NotNullish<E>,
> = (...args: Parameters<F>) => ResultAsync<Awaited<ReturnType<F>>, E>;
