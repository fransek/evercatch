/**
 * The values that are falsy at runtime.
 *
 * `NaN` is also falsy, but it cannot be expressed as a type, so `number` is
 * still considered a valid error type.
 */
export type Falsy = false | 0 | 0n | "" | null | undefined;

/**
 * Constraint that rejects error types that could be falsy at runtime.
 *
 * An error has to be truthy to be able to branch off the result, so every
 * error type in this library is constrained with it. Use it when writing your
 * own generic helpers around {@link Result}.
 * @template E The type of the error.
 * @example
 * ```typescript
 * function logError<E extends Truthy<E>>(result: Result<unknown, E>) {
 *   const [error] = result;
 *   if (error) {
 *     console.error(error);
 *   }
 * }
 * ```
 */
export type Truthy<E> = [Extract<E, Falsy>] extends [never] ? unknown : never;

/**
 * Represents a successful result containing a value.
 * @template T The type of the value.
 */
export type ResultOk<T> = readonly [null, T];

/**
 * Represents an error result containing an error.
 * @template E The type of the error. Has to be truthy.
 */
export type ResultErr<E extends Truthy<E>> = readonly [E, null];

/**
 * Represents a result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Has to be truthy.
 */
export type Result<T, E extends Truthy<E>> = ResultOk<T> | ResultErr<E>;

/**
 * Represents an asynchronous result that can be either successful or an error.
 * @template T The type of the value in case of success.
 * @template E The type of the error in case of failure. Has to be truthy.
 */
export type ResultAsync<T, E extends Truthy<E>> = Promise<Result<T, E>>;

/**
 * Represents a function that returns a Result.
 * @template F The function type.
 * @template E The type of the error. Has to be truthy.
 */
export type ResultFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => any,
  E extends Truthy<E>,
> = (...args: Parameters<F>) => Result<ReturnType<F>, E>;

/**
 * Represents an asynchronous function that returns a ResultAsync.
 * @template F The async function type.
 * @template E The type of the error. Has to be truthy.
 */
export type ResultAsyncFn<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
  E extends Truthy<E>,
> = (...args: Parameters<F>) => ResultAsync<Awaited<ReturnType<F>>, E>;
