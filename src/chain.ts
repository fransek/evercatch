import { ok } from "./shared";
import type { NotNullish, UncheckedResult } from "./types";

// The chains hold results whose error type may be computed, such as the union
// of every error in a chain, so they use UncheckedResult. They can only be
// created from results, whose error types are already checked.

/** A result, or anything that resolves to one, such as an async result. */
type MaybeAsync<T, E> =
  | UncheckedResult<T, E>
  | PromiseLike<UncheckedResult<T, E>>;

function failed<T, E>(
  result: UncheckedResult<T, E>,
): result is readonly [E, null] {
  return result[0] !== null;
}

/**
 * A {@link Result} wrapped for method chaining. Create one by calling
 * `Result(result)`.
 *
 * Every method returns a new chain, except the ones that end it: `toResult`
 * gives back the tuple, and `unwrapOr`, `unwrapOrElse`, `unwrapOrThrow` and
 * `match` give back a value.
 * @group Chains
 * @template T The type of the value.
 * @template E The type of the error.
 * @example
 * ```typescript
 * const port = Result(parseConfig(raw))
 *   .andThen(validate)
 *   .map((config) => config.port)
 *   .unwrapOr(3000);
 * ```
 */
export class ResultChain<T, E> {
  readonly #result: UncheckedResult<T, E>;

  /** @param result The result to wrap. */
  constructor(result: UncheckedResult<T, E>) {
    this.#result = result;
  }

  /**
   * Transforms the value, passing errors through untouched.
   * @see {@link map}
   */
  map<U>(fn: (value: T) => U): ResultChain<U, E> {
    const result = this.#result;
    return new ResultChain(failed(result) ? result : ok(fn(result[1])));
  }

  /**
   * Transforms the error, passing ok results through untouched.
   * @see {@link mapErr}
   */
  mapErr<F extends NotNullish<F>>(fn: (error: E) => F): ResultChain<T, F> {
    const result = this.#result;
    return new ResultChain<T, F>(
      failed(result) ? [fn(result[0]), null] : result,
    );
  }

  /**
   * Chains a function that returns a result. Errors short circuit.
   * @see {@link andThen}
   */
  andThen<U, F>(
    fn: (value: T) => UncheckedResult<U, F>,
  ): ResultChain<U, E | F> {
    const result = this.#result;
    return new ResultChain<U, E | F>(failed(result) ? result : fn(result[1]));
  }

  /**
   * Recovers from an error with a function that returns a new result.
   * @see {@link orElse}
   */
  orElse<U, F>(fn: (error: E) => UncheckedResult<U, F>): ResultChain<T | U, F> {
    const result = this.#result;
    return new ResultChain<T | U, F>(failed(result) ? fn(result[0]) : result);
  }

  /**
   * Calls a function with the value for side effects, keeping the result.
   * @see {@link tap}
   */
  tap(fn: (value: T) => unknown): ResultChain<T, E> {
    if (!failed(this.#result)) {
      fn(this.#result[1]);
    }
    return this;
  }

  /**
   * Calls a function with the error for side effects, keeping the result.
   * @see {@link tapErr}
   */
  tapErr(fn: (error: E) => unknown): ResultChain<T, E> {
    if (failed(this.#result)) {
      fn(this.#result[0]);
    }
    return this;
  }

  /**
   * Continues the chain asynchronously, so later steps can be async.
   * @returns A {@link ResultAsyncChain} holding the same result.
   */
  toAsync(): ResultAsyncChain<T, E> {
    return new ResultAsyncChain(this.#result);
  }

  /**
   * Ends the chain, giving back the result tuple.
   * @returns The result, ready to destructure.
   */
  toResult(): UncheckedResult<T, E> {
    return this.#result;
  }

  /**
   * Ends the chain by handling both outcomes.
   * @see {@link match}
   */
  match<A, B = A>(handlers: {
    ok: (value: T) => A;
    err: (error: E) => B;
  }): A | B {
    const result = this.#result;
    return failed(result) ? handlers.err(result[0]) : handlers.ok(result[1]);
  }

  /**
   * Ends the chain with the value, or a fallback if it holds an error.
   * @see {@link unwrapOr}
   */
  unwrapOr(fallback: T): T {
    const result = this.#result;
    return failed(result) ? fallback : result[1];
  }

  /**
   * Ends the chain with the value, or a fallback computed from the error.
   * @see {@link unwrapOrElse}
   */
  unwrapOrElse(fn: (error: E) => T): T {
    const result = this.#result;
    return failed(result) ? fn(result[0]) : result[1];
  }

  /**
   * Ends the chain with the value, throwing the error if it holds one.
   * @see {@link unwrapOrThrow}
   */
  unwrapOrThrow(): T {
    const result = this.#result;
    if (failed(result)) {
      throw result[0];
    }
    return result[1];
  }
}

/**
 * A {@link ResultAsync} wrapped for method chaining. Create one by calling
 * `ResultAsync(resultAsync)`. Functions under the `ResultAsync` namespace,
 * such as `ResultAsync.from`, return one too.
 *
 * It's a promise of a result, so awaiting it gives back the tuple, ready to
 * destructure, and it can be used anywhere a {@link ResultAsync} is expected.
 * Callbacks can be sync or async, and can return results or async results.
 * @group Chains
 * @template T The type of the value.
 * @template E The type of the error.
 * @example
 * ```typescript
 * const [error, email] = await ResultAsync(fetchUser(id))
 *   .andThen((user) => validateEmail(user.email))
 *   .map((email) => email.toLowerCase());
 * ```
 */
export class ResultAsyncChain<T, E> implements Promise<UncheckedResult<T, E>> {
  readonly #promise: Promise<UncheckedResult<T, E>>;

  /** Identifies chains in `Object.prototype.toString` and debuggers. */
  readonly [Symbol.toStringTag] = "ResultAsync";

  /** @param result The result, or async result, to wrap. */
  constructor(result: MaybeAsync<T, E>) {
    this.#promise = Promise.resolve(result);
  }

  /** Implements `Promise.then`, so the chain can be awaited. */
  then<A = UncheckedResult<T, E>, B = never>(
    onfulfilled?: ((value: UncheckedResult<T, E>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  /** Implements `Promise.catch`. */
  catch<B = never>(
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): Promise<UncheckedResult<T, E> | B> {
    return this.#promise.catch(onrejected);
  }

  /** Implements `Promise.finally`. */
  finally(onfinally?: (() => void) | null): Promise<UncheckedResult<T, E>> {
    return this.#promise.finally(onfinally);
  }

  #next<U, F>(
    fn: (result: UncheckedResult<T, E>) => MaybeAsync<U, F>,
  ): ResultAsyncChain<U, F> {
    return new ResultAsyncChain(this.#promise.then(fn));
  }

  /**
   * Transforms the value, passing errors through untouched.
   * @see {@link mapAsync}
   */
  map<U>(fn: (value: T) => U | PromiseLike<U>): ResultAsyncChain<U, E> {
    return this.#next(async (result) =>
      failed(result) ? result : ok(await fn(result[1])),
    );
  }

  /**
   * Transforms the error, passing ok results through untouched.
   * @see {@link mapErrAsync}
   */
  mapErr<F extends NotNullish<F>>(
    fn: (error: E) => F | PromiseLike<F>,
  ): ResultAsyncChain<T, F> {
    return this.#next<T, F>(async (result) =>
      failed(result) ? [await fn(result[0]), null] : result,
    );
  }

  /**
   * Chains a function that returns a result or an async result. Errors short
   * circuit.
   * @see {@link andThenAsync}
   */
  andThen<U, F>(
    fn: (value: T) => MaybeAsync<U, F>,
  ): ResultAsyncChain<U, E | F> {
    return this.#next<U, E | F>((result) =>
      failed(result) ? result : fn(result[1]),
    );
  }

  /**
   * Recovers from an error with a function that returns a result or an
   * async result.
   * @see {@link orElseAsync}
   */
  orElse<U, F>(fn: (error: E) => MaybeAsync<U, F>): ResultAsyncChain<T | U, F> {
    return this.#next<T | U, F>((result) =>
      failed(result) ? fn(result[0]) : result,
    );
  }

  /**
   * Calls a function with the value for side effects, keeping the result.
   * An async function is awaited before the chain continues.
   * @see {@link tapAsync}
   */
  tap(fn: (value: T) => unknown): ResultAsyncChain<T, E> {
    return this.#next(async (result) => {
      if (!failed(result)) {
        await fn(result[1]);
      }
      return result;
    });
  }

  /**
   * Calls a function with the error for side effects, keeping the result.
   * An async function is awaited before the chain continues.
   * @see {@link tapErrAsync}
   */
  tapErr(fn: (error: E) => unknown): ResultAsyncChain<T, E> {
    return this.#next(async (result) => {
      if (failed(result)) {
        await fn(result[0]);
      }
      return result;
    });
  }

  /**
   * Ends the chain by handling both outcomes. Handlers can be async.
   * @see {@link matchAsync}
   */
  async match<A, B = A>(handlers: {
    ok: (value: T) => A | PromiseLike<A>;
    err: (error: E) => B | PromiseLike<B>;
  }): Promise<A | B> {
    const result = await this.#promise;
    return failed(result)
      ? await handlers.err(result[0])
      : await handlers.ok(result[1]);
  }

  /**
   * Ends the chain with the value, or a fallback if it holds an error.
   * @see {@link unwrapAsyncOr}
   */
  async unwrapOr(fallback: T): Promise<T> {
    const result = await this.#promise;
    return failed(result) ? fallback : result[1];
  }

  /**
   * Ends the chain with the value, or a fallback computed from the error.
   * The function can be async.
   * @see {@link unwrapAsyncOrElse}
   */
  async unwrapOrElse(fn: (error: E) => T | PromiseLike<T>): Promise<T> {
    const result = await this.#promise;
    return failed(result) ? await fn(result[0]) : result[1];
  }

  /**
   * Ends the chain with the value, rejecting with the error if it holds one.
   * @see {@link unwrapAsyncOrThrow}
   */
  async unwrapOrThrow(): Promise<T> {
    const result = await this.#promise;
    if (failed(result)) {
      throw result[0];
    }
    return result[1];
  }
}
