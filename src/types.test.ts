import { describe, expect, expectTypeOf, it, vi } from "vitest";

import * as async from "./async";
import {
  fromAsyncThrowable,
  fromPromise,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
} from "./async";
import { err, isErr, isOk, ok } from "./shared";
import * as sync from "./sync";
import {
  fromThrowable,
  resultFrom,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";
import type {
  InferErr,
  InferOk,
  NotNullish,
  ResultErr,
  ResultOk,
} from "./types";
import { Result, ResultAsync, ResultAsyncFn, ResultFn } from "./types";

/**
 * Type-level assertions: every nullish error type is rejected at compile time.
 * Each `@ts-expect-error` fails the build if the type below it ever compiles.
 */
// @ts-expect-error null means "no error"
export type NullErr = ResultErr<null>;
// @ts-expect-error undefined means "no error"
export type UndefinedErr = ResultErr<undefined>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullErr = Result<number, Error | null>;
// @ts-expect-error a possibly undefined error is not a valid error type
export type MaybeUndefinedErr = ResultAsync<number, Error | undefined>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullFn = ResultFn<() => number, string | null>;
// @ts-expect-error a possibly null error is not a valid error type
export type MaybeNullAsyncFn = ResultAsyncFn<() => Promise<number>, 0 | null>;

describe("types", () => {
  it("should model result tuple types", () => {
    const success: ResultOk<number> = [null, 42];
    const failure: ResultErr<Error> = [new Error("test"), null];
    const result: Result<number, Error> = success;

    expect(success).toEqual([null, 42]);
    expect(failure[0]).toBeInstanceOf(Error);
    expect(failure[1]).toBe(null);
    expect(result).toEqual([null, 42]);
  });

  it("should model result function types", async () => {
    const resultFn: ResultFn<(value: number) => string, Error> = (value) => [
      null,
      String(value),
    ];
    const resultAsyncFn: ResultAsyncFn<
      (value: number) => Promise<string>,
      Error
    > = async (value) => [null, String(value)];
    const asyncResult: ResultAsync<string, Error> = Promise.resolve([
      null,
      "hello",
    ] as const);

    expect(resultFn(42)).toEqual([null, "42"]);
    await expect(resultAsyncFn(42)).resolves.toEqual([null, "42"]);
    await expect(asyncResult).resolves.toEqual([null, "hello"]);
  });

  it("should allow error types that are not nullish, including falsy ones", () => {
    type StringErr = Result<number, string>;
    type UnionErr = Result<number, { code: "DB" } | { code: "FILE" }>;
    type UnknownErr = Result<number, unknown>;
    type FalsyErr = Result<number, 0 | "">;

    const stringErr: StringErr = ["boom", null];
    const unionErr: UnionErr = [{ code: "DB" }, null];
    const unknownErr: UnknownErr = [new Error("test"), null];
    const falsyErr: FalsyErr = [0, null];

    expect(stringErr[0]).toBe("boom");
    expect(unionErr[0]).toEqual({ code: "DB" });
    expect(unknownErr[1]).toBe(null);
    expect(falsyErr[0]).toBe(0);
  });

  it("should propagate the constraint to generic helpers", () => {
    const firstError = <T, E extends NotNullish<E>>(
      results: Result<T, E>[],
    ): E | null => {
      for (const [error] of results) {
        if (error) {
          return error;
        }
      }
      return null;
    };

    const error = new Error("test");
    const results: Result<number, Error>[] = [
      [null, 1],
      [error, null],
    ];

    expect(firstError(results)).toBe(error);
    expect(firstError<number, Error>([[null, 1]])).toBe(null);
  });
});

describe("inference types", () => {
  type FetchError = "NOT_FOUND" | "NETWORK";

  it("should infer from a Result", () => {
    expectTypeOf<InferOk<Result<number, Error>>>().toEqualTypeOf<number>();
    expectTypeOf<InferErr<Result<number, Error>>>().toEqualTypeOf<Error>();
    expectTypeOf<
      InferErr<Result<number, FetchError>>
    >().toEqualTypeOf<FetchError>();
    expectTypeOf<InferOk<Result<string | number, Error>>>().toEqualTypeOf<
      string | number
    >();
  });

  it("should infer from the halves of a Result", () => {
    expectTypeOf<InferOk<ResultOk<number>>>().toEqualTypeOf<number>();
    expectTypeOf<InferErr<ResultOk<number>>>().toEqualTypeOf<never>();
    expectTypeOf<InferOk<ResultErr<Error>>>().toEqualTypeOf<never>();
    expectTypeOf<InferErr<ResultErr<Error>>>().toEqualTypeOf<Error>();
    expectTypeOf<InferOk<typeof ok<number>>>().toEqualTypeOf<number>();
  });

  it("should not confuse a null value with an error", () => {
    expectTypeOf<InferOk<Result<null, Error>>>().toEqualTypeOf<null>();
    expectTypeOf<InferErr<Result<null, Error>>>().toEqualTypeOf<Error>();
    expectTypeOf<InferErr<ResultOk<null>>>().toEqualTypeOf<never>();
    expectTypeOf<
      InferOk<Result<undefined, Error>>
    >().toEqualTypeOf<undefined>();
  });

  it("should infer unknown errors", () => {
    expectTypeOf<InferErr<Result<number, unknown>>>().toEqualTypeOf<unknown>();
  });

  it("should infer from a ResultAsync", () => {
    expectTypeOf<
      InferOk<ResultAsync<Response, Error>>
    >().toEqualTypeOf<Response>();
    expectTypeOf<
      InferErr<ResultAsync<Response, FetchError>>
    >().toEqualTypeOf<FetchError>();
  });

  it("should infer from result-returning functions", async () => {
    const safeParse = fromThrowable((raw: string): { foo: string } =>
      JSON.parse(raw),
    );
    const safeDouble = fromAsyncThrowable(
      async (value: number) => value * 2,
      (): FetchError => "NETWORK",
    );
    async function fetchUser(
      id: string,
    ): ResultAsync<{ id: string }, FetchError> {
      return ok({ id });
    }

    expectTypeOf<InferOk<typeof safeParse>>().toEqualTypeOf<{ foo: string }>();
    expectTypeOf<InferErr<typeof safeParse>>().toEqualTypeOf<Error>();
    expectTypeOf<InferOk<typeof safeDouble>>().toEqualTypeOf<number>();
    expectTypeOf<InferErr<typeof safeDouble>>().toEqualTypeOf<FetchError>();
    expectTypeOf<InferOk<typeof fetchUser>>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<InferErr<typeof fetchUser>>().toEqualTypeOf<FetchError>();
    expectTypeOf<
      InferOk<ResultFn<(value: number) => string, Error>>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      InferErr<ResultAsyncFn<() => Promise<string>, FetchError>>
    >().toEqualTypeOf<FetchError>();

    expect(safeParse('{"foo": "bar"}')).toEqual([null, { foo: "bar" }]);
    await expect(safeDouble(21)).resolves.toEqual([null, 42]);
    await expect(fetchUser("1")).resolves.toEqual([null, { id: "1" }]);
  });
});

// @ts-expect-error a plain value is not a result
export type InferFromValue = InferOk<number>;
// @ts-expect-error a function that does not return a result is not inferable
export type InferFromFn = InferErr<() => number>;
// @ts-expect-error a tuple without a null slot is not a result
export type InferFromTuple = InferOk<readonly [string, number]>;

describe("namespaces", () => {
  describe("Result", () => {
    it("should group the Result functions under shorter names", () => {
      expect(Result).toEqual({
        ok,
        err,
        isOk,
        isErr,
        from: resultFrom,
        unwrapOrThrow,
        unwrapOr,
        unwrapOrElse,
        map: sync.map,
        mapErr: sync.mapErr,
        andThen: sync.andThen,
        match: sync.match,
        all: sync.all,
        collect: sync.collect,
        gen: sync.gen,
        fromNullable: sync.fromNullable,
        toNullable: sync.toNullable,
      });
    });

    it("should share its name with the type it groups", () => {
      const result: Result<number, Error> = Result.ok(42);

      expect(result).toEqual([null, 42]);
      expectTypeOf(Result.ok(42)).toEqualTypeOf<ResultOk<number>>();
      expectTypeOf(Result.err("boom")).toEqualTypeOf<ResultErr<string>>();
    });

    it("should create and unwrap results", () => {
      expect(Result.ok(42)).toEqual([null, 42]);
      expect(Result.ok()).toEqual([null, undefined]);
      expect(Result.err("boom")).toEqual(["boom", null]);
      expect(Result.err()).toEqual([expect.any(Error), null]);
      expect(Result.from(() => 42)).toEqual([null, 42]);
      expect(Result.unwrapOrThrow(Result.ok(42))).toBe(42);
      expect(Result.unwrapOr(Result.err(new Error("Oops")), 0)).toBe(0);
      expect(Result.unwrapOrElse(Result.err(new Error("Oops")), () => 0)).toBe(
        0,
      );
    });

    it("should pass the error mapper through", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const [error] = Result.from(() => {
        throw "original";
      }, mapErr);

      expect(error).toBeInstanceOf(Error);
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });

  describe("ResultFn", () => {
    it("should group the functions that create a ResultFn", () => {
      expect(Object.keys(ResultFn)).toEqual(["from"]);
      expect(ResultFn.from).toBe(fromThrowable);
    });

    it("should share its name with the type it groups", () => {
      const double: ResultFn<(value: number) => number, Error> = ResultFn.from(
        (value: number) => value * 2,
      );

      expect(double(21)).toEqual([null, 42]);
    });
  });

  describe("ResultAsync", () => {
    it("should group the ResultAsync functions under shorter names", () => {
      expect(ResultAsync).toEqual({
        from: fromPromise,
        unwrapOrThrow: unwrapAsyncOrThrow,
        unwrapOr: unwrapAsyncOr,
        unwrapOrElse: unwrapAsyncOrElse,
        map: async.mapAsync,
        mapErr: async.mapErrAsync,
        andThen: async.andThenAsync,
        match: async.matchAsync,
        all: async.allAsync,
        collect: async.collectAsync,
        gen: async.genAsync,
        retry: async.retry,
        withTimeout: async.withTimeout,
      });
    });

    it("should share its name with the type it groups", async () => {
      const result: ResultAsync<number, Error> = ResultAsync.from(
        Promise.resolve(42),
      );

      await expect(result).resolves.toEqual([null, 42]);
    });

    it("should create and unwrap async results", async () => {
      await expect(ResultAsync.from(Promise.resolve(42))).resolves.toEqual([
        null,
        42,
      ]);
      await expect(
        ResultAsync.unwrapOrThrow(Promise.resolve(ok(42))),
      ).resolves.toBe(42);
      await expect(
        ResultAsync.unwrapOr(Promise.resolve(err(new Error("Oops"))), 0),
      ).resolves.toBe(0);
      await expect(
        ResultAsync.unwrapOrElse(
          Promise.resolve(err(new Error("Oops"))),
          () => 0,
        ),
      ).resolves.toBe(0);
    });
  });

  describe("ResultAsyncFn", () => {
    it("should group the functions that create a ResultAsyncFn", () => {
      expect(Object.keys(ResultAsyncFn)).toEqual(["from"]);
      expect(ResultAsyncFn.from).toBe(fromAsyncThrowable);
    });

    it("should share its name with the type it groups", async () => {
      const double: ResultAsyncFn<(value: number) => Promise<number>, Error> =
        ResultAsyncFn.from(async (value: number) => value * 2);

      await expect(double(21)).resolves.toEqual([null, 42]);
    });
  });
});
