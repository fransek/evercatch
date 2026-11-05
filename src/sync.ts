import { defaultErrorMapper, err, isErr, ok } from "./shared";
import type {
  ErrOf,
  NotNullish,
  OkOf,
  Result,
  ResultErr,
  ResultFn,
  UncheckedResult,
} from "./types";

/**
 * Safely executes a function, catching any errors.
 * @group Sync
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param mapErr A function to map errors to a specific type.
 * @returns A Result containing either the function's return value or the caught error.
 * @example
 * ```typescript
 * const [error, data] = resultFrom(() => JSON.parse('{"foo": "bar"}'));
 * if (error) {
 *   console.error(error.message);
 * } else {
 *   console.log(data);
 * }
 * ```
 */
export function resultFrom<T, E extends NotNullish<E> = Error>(
  fn: () => T,
  mapErr: (err: unknown) => E = defaultErrorMapper,
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(mapErr(error));
  }
}

/**
 * Wraps a function to return a Result instead of throwing errors.
 * @group Sync
 * @template F The function type.
 * @template E The type of the error.
 * @param fn The function to wrap.
 * @param mapErr A function to map errors to a specific type.
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
export function fromThrowable<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => any,
  E extends NotNullish<E> = Error,
>(fn: F, mapErr: (err: unknown) => E = defaultErrorMapper): ResultFn<F, E> {
  return (...args) => {
    return resultFrom(() => fn(...args), mapErr);
  };
}

/**
 * Unwraps a Result, throwing the error if it exists.
 * @group Sync
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
export function unwrapOrThrow<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
): T {
  if (isErr(result)) {
    throw result[0];
  }
  return result[1];
}

/**
 * Unwraps a Result, returning a fallback value if it contains an error.
 * @group Sync
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
export function unwrapOr<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
  fallback: T,
): T {
  if (isErr(result)) {
    return fallback;
  }
  return result[1];
}

/**
 * Unwraps a Result, computing a fallback value from the error when needed.
 * @group Sync
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
export function unwrapOrElse<T, E extends NotNullish<E> = Error>(
  result: Result<T, E>,
  fallbackFn: (err: E) => T,
): T {
  if (isErr(result)) {
    return fallbackFn(result[0]);
  }
  return result[1];
}

/**
 * Transforms the value of an ok result, passing errors through untouched.
 * @group Sync
 * @template T The type of the value.
 * @template U The type of the transformed value.
 * @template E The type of the error.
 * @param result The result to transform.
 * @param fn A function that receives the value and returns a new one.
 * @returns A result holding the transformed value, or the original error.
 * @example
 * ```typescript
 * const [error, length] = map(ok("hello"), (value) => value.length); // [null, 5]
 * ```
 */
export function map<T, U, E extends NotNullish<E>>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isErr(result)) {
    return result;
  }
  return ok(fn(result[1]));
}

/**
 * Transforms the error of an error result, passing ok results through
 * untouched.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @template F The type of the transformed error. Cannot be nullish.
 * @param result The result to transform.
 * @param fn A function that receives the error and returns a new one.
 * @returns A result holding the original value, or the transformed error.
 * @example
 * ```typescript
 * const [error] = mapErr(
 *   err(new Error("Oops")),
 *   (error) => ({ kind: "parse", message: error.message }) as const,
 * ); // [{ kind: "parse", message: "Oops" }, null]
 * ```
 */
export function mapErr<T, E extends NotNullish<E>, F extends NotNullish<F>>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result[0]));
  }
  return result;
}

/**
 * Chains a function that returns a result onto an ok result. Errors short
 * circuit, so the function only runs when the result is ok.
 * @group Sync
 * @template T The type of the value.
 * @template U The type of the value returned by the function.
 * @template E The type of the error.
 * @template F The type of the error returned by the function.
 * @param result The result to chain onto.
 * @param fn A function that receives the value and returns a new result.
 * @returns The result returned by the function, or the original error.
 * @example
 * ```typescript
 * const [error, value] = andThen(parse(raw), (config) => validate(config));
 * ```
 */
export function andThen<T, U, E extends NotNullish<E>, F extends NotNullish<F>>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  if (isErr(result)) {
    return result;
  }
  return fn(result[1]);
}

/**
 * Handles both outcomes of a result in a single expression.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @template A The type returned by the `ok` handler.
 * @template B The type returned by the `err` handler.
 * @param result The result to match on.
 * @param handlers One handler for the value and one for the error.
 * @returns Whatever the matching handler returns.
 * @example
 * ```typescript
 * const message = match(divide(10, 2), {
 *   ok: (value) => `Result: ${value}`,
 *   err: (error) => `Failed: ${error.message}`,
 * });
 * ```
 */
export function match<T, E extends NotNullish<E>, A, B = A>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B },
): A | B {
  if (isErr(result)) {
    return handlers.err(result[0]);
  }
  return handlers.ok(result[1]);
}

/**
 * The values of a tuple or array of results, in the same shape.
 * @internal
 */
export type OkValues<R extends readonly unknown[]> = {
  -readonly [K in keyof R]: OkOf<Awaited<R[K]>>;
};

/**
 * Combines several results into one. If every result is ok, the combined
 * result holds all of their values in order. Otherwise it holds the first
 * error, in input order.
 *
 * Tuples keep their shape, so each value keeps its own type.
 * @group Sync
 * @template R The tuple or array of results.
 * @param results The results to combine.
 * @returns A result holding every value, or the first error.
 * @example
 * ```typescript
 * const [error, values] = all([ok(1), ok("two")]); // [null, [1, "two"]]
 * ```
 * @example
 * ```typescript
 * const [error] = all([ok(1), err("Oops"), err("Again")]); // ["Oops", null]
 * ```
 */
export function all<const R extends readonly Result<unknown, unknown>[]>(
  results: R,
): UncheckedResult<OkValues<R>, ErrOf<R[number]>> {
  const values: unknown[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result as readonly [ErrOf<R[number]>, null];
    }
    values.push(result[1]);
  }
  return ok(values as OkValues<R>);
}

/**
 * Combines several results into one, collecting every error instead of
 * stopping at the first. Useful for validation, where every problem should
 * be reported at once.
 *
 * If every result is ok, the combined result holds all of their values in
 * order, like {@link all}. Otherwise it holds an array of every error, in
 * input order.
 * @group Sync
 * @template R The tuple or array of results.
 * @param results The results to combine.
 * @returns A result holding every value, or every error.
 * @example
 * ```typescript
 * const [errors] = collect([
 *   validateName(name),
 *   validateEmail(email),
 * ]); // ["Name is required", "Email is invalid"] or null
 * ```
 */
export function collect<const R extends readonly Result<unknown, unknown>[]>(
  results: R,
): Result<OkValues<R>, ErrOf<R[number]>[]> {
  const values: unknown[] = [];
  const errors: ErrOf<R[number]>[] = [];
  for (const result of results) {
    if (isErr(result)) {
      errors.push(result[0] as ErrOf<R[number]>);
    } else {
      values.push(result[1]);
    }
  }
  if (errors.length > 0) {
    return err(errors);
  }
  return ok(values as OkValues<R>);
}

/**
 * The helper passed to a {@link gen} callback. `yield*` it with a result to
 * get the value, or to return the error from the whole block.
 */
export type Unwrap = <T, E extends NotNullish<E>>(
  result: Result<T, E>,
) => Generator<ResultErr<E>, T, unknown>;

function* unwrapStep<T, E extends NotNullish<E>>(
  result: Result<T, E>,
): Generator<ResultErr<E>, T, unknown> {
  if (isErr(result)) {
    yield result;
  }
  return result[1] as T;
}

/**
 * Runs a block of code where every `yield* $(result)` either produces the
 * value of an ok result, or stops the block and returns the error. It's the
 * early return pattern without the `if (error) return err(error)` lines.
 *
 * Whatever the block returns becomes the value of an ok result. The error
 * type is the union of every error that can be yielded. `finally` blocks
 * inside the generator run when it stops early.
 *
 * Errors thrown inside the block are not caught. Wrap code that might throw
 * with {@link resultFrom} first.
 * @group Sync
 * @template Y The error results that can be yielded.
 * @template T The type of the value returned by the block.
 * @param fn A generator function that receives the `$` helper.
 * @returns A result holding the returned value, or the first yielded error.
 * @example
 * ```typescript
 * const [error, total] = gen(function* ($) {
 *   const a = yield* $(parseNumber("4"));
 *   const b = yield* $(parseNumber("2"));
 *   return a + b;
 * }); // [null, 6]
 * ```
 */
export function gen<Y extends ResultErr<unknown>, T>(
  fn: ($: Unwrap) => Generator<Y, T, unknown>,
): UncheckedResult<T, ErrOf<Y>> {
  const iterator = fn(unwrapStep);
  const step = iterator.next();
  if (step.done) {
    return ok(step.value);
  }
  iterator.return(undefined as T);
  return step.value as readonly [ErrOf<Y>, null];
}

/**
 * Turns a possibly nullish value into a result, with a new Error when the
 * value is `null` or `undefined`.
 * @group Sync
 * @template T The type of the value.
 * @param value The value to check.
 * @returns A result holding the value, or an Error if it was nullish.
 * @example
 * ```typescript
 * const [error, user] = fromNullable(users.get(id));
 * ```
 */
export function fromNullable<T>(value: T): Result<NonNullable<T>, Error>;
/**
 * Turns a possibly nullish value into a result, with the given error when
 * the value is `null` or `undefined`.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error. Cannot be nullish.
 * @param value The value to check.
 * @param error The error to use when the value is nullish.
 * @returns A result holding the value, or the error if it was nullish.
 * @example
 * ```typescript
 * const [error, user] = fromNullable(users.get(id), "NOT_FOUND" as const);
 * ```
 */
export function fromNullable<T, E extends NotNullish<E>>(
  value: T,
  error: E,
): Result<NonNullable<T>, E>;
export function fromNullable<T, E extends NotNullish<E> = Error>(
  value: T,
  error?: E,
): Result<NonNullable<T>, E> {
  if (value === null || value === undefined) {
    return err(error ?? (new Error("Value is null or undefined") as E));
  }
  return ok(value as NonNullable<T>);
}

/**
 * Turns a result into its value, or `null` if it holds an error.
 * @group Sync
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The result to convert.
 * @returns The value, or `null`.
 * @example
 * ```typescript
 * const config = toNullable(Result.from(() => JSON.parse(raw)));
 * ```
 */
export function toNullable<T, E extends NotNullish<E>>(
  result: Result<T, E>,
): T | null {
  return isErr(result) ? null : result[1];
}
