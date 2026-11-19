import { fromAsync } from "./async";
import { defaultMapErr } from "./shared";
import { fromSync } from "./sync";
import type {
  InferErr,
  InferOk,
  NonNullishError,
  Result,
  ResultAsync,
  ResultErr,
} from "./types";

// What a generator body may yield (the errors `bind` short-circuits with) and
// return (a result of its own, ok or err).
type AnyErr = ResultErr<unknown>;
type AnyResult = Result<unknown, unknown>;

/**
 * The result a generator body resolves to, given what it yields and returns.
 *
 * Spelled out as tuples rather than `Result<...>`: the error union can never
 * be nullish, since `InferErr` drops `null`, but TypeScript cannot see that
 * through the generics to satisfy `NonNullishError`.
 */
type GenResult<Y extends AnyErr, R extends AnyResult> =
  | readonly [null, InferOk<R>]
  | readonly [InferErr<Y> | InferErr<R>, null];

/**
 * Unwraps a {@link Result} inside a {@link genSync} or {@link genAsync} body.
 *
 * Use it with `yield*`: an ok result evaluates to its value, and an error
 * result ends the body right there, making the error the outcome of the whole
 * generator. `finally` blocks in the body still run.
 *
 * In an async body, await the result first, as in `yield* bind(await promise)`,
 * or use {@link bindAsync}. To wrap a throwing call and bind it in one step,
 * use {@link bindFrom} or {@link bindAsyncFrom}.
 * @group Generators
 * @template T The type of the value.
 * @template E The type of the error.
 * @param result The result to unwrap.
 * @returns A generator to delegate to with `yield*`, evaluating to the value.
 * @example
 * ```typescript
 * const result = genSync(function* () {
 *   const a = yield* bind(parse(rawA));
 *   const b = yield* bind(parse(rawB));
 *   return ok(a + b);
 * });
 * ```
 */
export function* bind<T, E extends NonNullishError<E>>(
  result: Result<T, E>,
): Generator<ResultErr<E>, T, unknown> {
  const [error, value] = result;
  if (error !== null) {
    yield [error, null] as const;
    // The runners never resume a generator after an error.
    throw new Error("A generator was resumed after bind yielded an error");
  }
  return value as T;
}

/**
 * Executes a function and unwraps its outcome inside a {@link genSync} or
 * {@link genAsync} body.
 *
 * Shorthand for `bind(fromSync(fn, mapErr))`: the return value is the value,
 * and anything thrown ends the body as an error result.
 *
 * Without `mapErr`, anything thrown that isn't an `Error` is wrapped in one,
 * with the original value kept as `cause`, just as {@link fromSync} does.
 * @group Generators
 * @template T The return type of the function.
 * @template E The type of the error.
 * @param fn The function to execute.
 * @param mapErr A function to map errors to a specific type.
 * @returns A generator to delegate to with `yield*`, evaluating to the function's return value.
 * @example
 * ```typescript
 * const result = genSync(function* () {
 *   const config = yield* bindFrom(() => JSON.parse(raw));
 *   return ok(config);
 * });
 * ```
 */
export function* bindFrom<T, E extends NonNullishError<E> = Error>(
  fn: () => T,
  mapErr: (error: unknown) => E = defaultMapErr,
): Generator<ResultErr<E>, T, unknown> {
  return yield* bind(fromSync(fn, mapErr));
}

/**
 * Awaits a {@link ResultAsync} and unwraps it inside a {@link genAsync} body.
 *
 * Shorthand for `bind(await resultAsync)`. Only works in an async body.
 * @group Generators
 * @template T The type of the value.
 * @template E The type of the error.
 * @param resultAsync The ResultAsync to unwrap.
 * @returns An async generator to delegate to with `yield*`, evaluating to the value.
 * @example
 * ```typescript
 * const result = await genAsync(async function* () {
 *   const user = yield* bindAsync(fetchUser(id));
 *   return ok(user.name);
 * });
 * ```
 */
export async function* bindAsync<T, E extends NonNullishError<E>>(
  resultAsync: ResultAsync<T, E>,
): AsyncGenerator<ResultErr<E>, T, unknown> {
  return yield* bind(await resultAsync);
}

/**
 * Awaits a promise and unwraps its outcome inside a {@link genAsync} body.
 *
 * Shorthand for `bind(await fromAsync(promise, mapErr))`: the resolved value
 * is the value, and a rejection ends the body as an error result. Only works
 * in an async body.
 *
 * Without `mapErr`, a rejection that isn't an `Error` is wrapped in one, with
 * the original value kept as `cause`, just as {@link fromAsync} does.
 * @group Generators
 * @template T The resolved type of the promise.
 * @template E The type of the error.
 * @param promise The promise to await.
 * @param mapErr A function to map errors to a specific type.
 * @returns An async generator to delegate to with `yield*`, evaluating to the resolved value.
 * @example
 * ```typescript
 * const result = await genAsync(async function* () {
 *   const response = yield* bindAsyncFrom(fetch("https://api.example.com/data"));
 *   const data = yield* bindAsyncFrom(response.json());
 *   return ok(data);
 * });
 * ```
 */
export async function* bindAsyncFrom<T, E extends NonNullishError<E> = Error>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E = defaultMapErr,
): AsyncGenerator<ResultErr<E>, T, unknown> {
  return yield* bind(await fromAsync(promise, mapErr));
}

/**
 * Runs a generator that unwraps results with {@link bind}, so a chain of
 * fallible steps reads like straight-line code instead of a series of early
 * returns.
 *
 * The first error result passed to `bind` becomes the outcome. Otherwise the
 * outcome is the result the body returns, which may be an error of its own.
 * The error type is the union of every error the body can produce.
 *
 * Anything the body throws is not caught; run throwing calls through
 * {@link bindFrom} instead.
 * @group Generators
 * @template Y The error results the body yields through `bind`.
 * @template R The result the body returns.
 * @param body A generator function that returns a result.
 * @returns The first error passed to `bind`, or the result the body returns.
 * @example
 * ```typescript
 * function parsePort(raw: string): Result<number, "NOT_A_NUMBER" | "OUT_OF_RANGE"> {
 *   return genSync(function* () {
 *     const port = yield* bind(toNumber(raw)); // Result<number, "NOT_A_NUMBER">
 *     if (port < 1 || port > 65535) return err("OUT_OF_RANGE" as const);
 *     return ok(port);
 *   });
 * }
 * ```
 */
export function genSync<Y extends AnyErr, R extends AnyResult>(
  body: () => Generator<Y, R, unknown>,
): GenResult<Y, R> {
  const iterator = body();
  const next = iterator.next();
  if (!next.done) {
    iterator.return(undefined as never);
  }
  return next.value as GenResult<Y, R>;
}

/**
 * The async version of {@link genSync}: runs an async generator that unwraps
 * results with {@link bind}.
 *
 * Await an async result before binding it: `yield* bind(await promise)`.
 *
 * Anything the body throws or rejects with is not caught, so the returned
 * promise rejects; run such calls through {@link bindFrom} or
 * {@link bindAsyncFrom} instead.
 * @group Generators
 * @template Y The error results the body yields through `bind`.
 * @template R The result the body returns.
 * @param body An async generator function that returns a result.
 * @returns A promise of the first error passed to `bind`, or of the result the body returns.
 * @example
 * ```typescript
 * async function fetchUserData(): ResultAsync<UserData, Error> {
 *   return genAsync(async function* () {
 *     const user = yield* bind(await fromAsync(auth()));
 *     const response = yield* bind(
 *       await fromAsync(fetch(`https://api.example.com/user/${user.id}`)),
 *     );
 *     if (!response.ok) return err(new Error("Failed to fetch user data"));
 *     return await fromAsync<UserData>(response.json());
 *   });
 * }
 * ```
 */
export async function genAsync<Y extends AnyErr, R extends AnyResult>(
  body: () => AsyncGenerator<Y, R, unknown>,
): Promise<GenResult<Y, R>> {
  const iterator = body();
  const next = await iterator.next();
  if (!next.done) {
    await iterator.return(undefined as never);
  }
  return next.value as GenResult<Y, R>;
}

/**
 * Creates a function that runs a generator body with {@link genSync} each
 * time it is called, passing its arguments through.
 *
 * Shorthand for `(...args) => genSync(() => body(...args))`, for defining a
 * result-returning function in one step.
 * @group Generators
 * @template A The parameter types of the function.
 * @template Y The error results the body yields through `bind`.
 * @template R The result the body returns.
 * @param body A generator function that returns a result.
 * @returns A function returning the first error passed to `bind`, or the result the body returns.
 * @example
 * ```typescript
 * const parsePort = genFn(function* (raw: string) {
 *   const port = yield* bind(toNumber(raw));
 *   if (port < 1 || port > 65535) return err("OUT_OF_RANGE" as const);
 *   return ok(port);
 * });
 *
 * const [error, port] = parsePort("8080");
 * ```
 */
export function genFn<
  A extends unknown[],
  Y extends AnyErr,
  R extends AnyResult,
>(
  body: (...args: A) => Generator<Y, R, unknown>,
): (...args: A) => GenResult<Y, R> {
  return (...args) => genSync(() => body(...args));
}

/**
 * Creates an async function that runs an async generator body with
 * {@link genAsync} each time it is called, passing its arguments through.
 *
 * Shorthand for `(...args) => genAsync(() => body(...args))`, for defining a
 * result-returning async function in one step.
 * @group Generators
 * @template A The parameter types of the function.
 * @template Y The error results the body yields through `bind`.
 * @template R The result the body returns.
 * @param body An async generator function that returns a result.
 * @returns An async function returning a promise of the first error passed to `bind`, or of the result the body returns.
 * @example
 * ```typescript
 * const fetchUserData = genAsyncFn(async function* (id: string) {
 *   const response = yield* bindAsyncFrom(fetch(`https://api.example.com/user/${id}`));
 *   if (!response.ok) return err(new Error("Failed to fetch user data"));
 *   return await fromAsync<UserData>(response.json());
 * });
 *
 * const [error, user] = await fetchUserData("42");
 * ```
 */
export function genAsyncFn<
  A extends unknown[],
  Y extends AnyErr,
  R extends AnyResult,
>(
  body: (...args: A) => AsyncGenerator<Y, R, unknown>,
): (...args: A) => Promise<GenResult<Y, R>> {
  return (...args) => genAsync(() => body(...args));
}
