import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { fromAsync } from "./async";
import {
  bind,
  bindAsync,
  bindAsyncFrom,
  bindFrom,
  genAsync,
  genAsyncFn,
  genFn,
  genSync,
} from "./gen";
import { err, ok } from "./shared";
import type { Result, ResultAsync } from "./types";

const toNumber = (raw: string): Result<number, "NOT_A_NUMBER"> => {
  const value = Number(raw);
  return Number.isNaN(value) ? err("NOT_A_NUMBER" as const) : ok(value);
};

const positive = (value: number): Result<number, "NOT_POSITIVE"> =>
  value > 0 ? ok(value) : err("NOT_POSITIVE" as const);

describe("gen", () => {
  describe("bind", () => {
    it("should evaluate to the value of an ok result", () => {
      const iterator = bind(ok(42));
      expect(iterator.next()).toEqual({ done: true, value: 42 });
    });

    it("should yield the error result of an err result", () => {
      const iterator = bind(err("boom"));
      expect(iterator.next()).toEqual({ done: false, value: ["boom", null] });
    });

    it("should throw if resumed after yielding an error", () => {
      const iterator = bind(err("boom"));
      iterator.next();
      expect(() => iterator.next()).toThrow(/resumed/);
    });

    it("should yield falsy errors", () => {
      const iterator = bind(err(0));
      expect(iterator.next()).toEqual({ done: false, value: [0, null] });
    });
  });

  describe("bindFrom", () => {
    it("should evaluate to the return value when the function succeeds", () => {
      const result = genSync(function* () {
        const config = yield* bindFrom(() => JSON.parse('{"port": 42}'));
        return ok(config.port as number);
      });

      expect(result).toEqual([null, 42]);
    });

    it("should end the body with the thrown error", () => {
      const after = vi.fn();

      const [error] = genSync(function* () {
        yield* bindFrom(() => JSON.parse("nope"));
        after();
        return ok();
      });

      expect(error).toBeInstanceOf(SyntaxError);
      expect(after).not.toHaveBeenCalled();
    });

    it("should wrap non-Error throwables", () => {
      const [error] = genSync(function* () {
        yield* bindFrom(() => {
          throw "original";
        });
        return ok();
      });

      expect(error).toBeInstanceOf(Error);
      expect(error?.cause).toBe("original");
    });

    it("should use mapErr", () => {
      const result = genSync(function* () {
        yield* bindFrom(
          () => {
            throw "original";
          },
          () => "MAPPED" as const,
        );
        return ok();
      });

      expect(result).toEqual(["MAPPED", null]);
      expectTypeOf(result).toMatchTypeOf<Result<undefined, "MAPPED">>();
    });
  });

  describe("bindAsync", () => {
    it("should evaluate to the value of an ok async result", async () => {
      const result = await genAsync(async function* () {
        const value = yield* bindAsync(Promise.resolve(ok(42)));
        return ok(value);
      });

      expect(result).toEqual([null, 42]);
    });

    it("should end the body with the error of an err async result", async () => {
      const after = vi.fn();

      const result = await genAsync(async function* () {
        yield* bindAsync(Promise.resolve(err("boom" as const)));
        after();
        return ok();
      });

      expect(result).toEqual(["boom", null]);
      expect(after).not.toHaveBeenCalled();
      expectTypeOf(result).toMatchTypeOf<Result<undefined, "boom">>();
    });
  });

  describe("bindAsyncFrom", () => {
    it("should evaluate to the resolved value", async () => {
      const result = await genAsync(async function* () {
        const value = yield* bindAsyncFrom(Promise.resolve(42));
        return ok(value);
      });

      expect(result).toEqual([null, 42]);
    });

    it("should end the body with the rejection", async () => {
      const after = vi.fn();
      const error = new Error("rejected");

      const result = await genAsync(async function* () {
        yield* bindAsyncFrom(Promise.reject(error));
        after();
        return ok();
      });

      expect(result).toEqual([error, null]);
      expect(after).not.toHaveBeenCalled();
    });

    it("should use mapErr", async () => {
      const result = await genAsync(async function* () {
        yield* bindAsyncFrom(
          Promise.reject("original"),
          () => "MAPPED" as const,
        );
        return ok();
      });

      expect(result).toEqual(["MAPPED", null]);
    });

    it("should mix with sync binds and run finally blocks", async () => {
      const cleanup = vi.fn();

      const result = await genAsync(async function* () {
        try {
          const a = yield* bind(toNumber("1"));
          const b = yield* bindFrom(() => a + 1);
          yield* bindAsyncFrom(Promise.reject(new Error("late")));
          return ok(b);
        } finally {
          cleanup();
        }
      });

      expect(result).toEqual([expect.any(Error), null]);
      expect(cleanup).toHaveBeenCalledOnce();
    });
  });

  describe("genSync", () => {
    it("should return the result the body returns", () => {
      const result = genSync(function* () {
        const a = yield* bind(toNumber("20"));
        const b = yield* bind(positive(22));
        return ok(a + b);
      });

      expect(result).toEqual([null, 42]);
    });

    it("should return the first error passed to bind", () => {
      const after = vi.fn();

      const result = genSync(function* () {
        const a = yield* bind(toNumber("nope"));
        after();
        const b = yield* bind(positive(-1));
        return ok(a + b);
      });

      expect(result).toEqual(["NOT_A_NUMBER", null]);
      expect(after).not.toHaveBeenCalled();
    });

    it("should return an error result the body returns", () => {
      const result = genSync(function* () {
        const a = yield* bind(toNumber("1"));
        if (a < 10) return err("TOO_SMALL" as const);
        return ok(a);
      });

      expect(result).toEqual(["TOO_SMALL", null]);
    });

    it("should keep falsy errors", () => {
      const result = genSync(function* () {
        yield* bind(err(""));
        return ok();
      });

      expect(result).toEqual(["", null]);
    });

    it("should run finally blocks when an error short-circuits", () => {
      const cleanup = vi.fn();

      genSync(function* () {
        try {
          yield* bind(err("boom"));
          return ok();
        } finally {
          cleanup();
        }
      });

      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("should not catch what the body throws", () => {
      expect(() =>
        genSync(function* () {
          yield* bind(ok(1));
          throw new Error("thrown");
        }),
      ).toThrow("thrown");
    });

    it("should infer the union of every error the body can produce", () => {
      const result = genSync(function* () {
        const a = yield* bind(toNumber("1"));
        const b = yield* bind(positive(a));
        if (b > 100) return err("TOO_BIG" as const);
        return ok(String(b));
      });

      expectTypeOf(result).toEqualTypeOf<
        | readonly [null, string]
        | readonly ["NOT_A_NUMBER" | "NOT_POSITIVE" | "TOO_BIG", null]
      >();
      expectTypeOf(result).toMatchTypeOf<
        Result<string, "NOT_A_NUMBER" | "NOT_POSITIVE" | "TOO_BIG">
      >();
    });

    it("should infer never as the error type when nothing can fail", () => {
      const result = genSync(function* () {
        const a = yield* bind(ok(1));
        return ok(a);
      });

      expectTypeOf(result).toEqualTypeOf<
        readonly [null, number] | readonly [never, null]
      >();
    });
  });

  describe("genAsync", () => {
    const fetchNumber = async (raw: string): ResultAsync<number, Error> =>
      fromAsync(Promise.resolve(raw).then(Number));

    it("should return the result the body returns", async () => {
      const result = await genAsync(async function* () {
        const a = yield* bind(await fetchNumber("20"));
        const b = yield* bind(positive(22));
        return ok(a + b);
      });

      expect(result).toEqual([null, 42]);
    });

    it("should return the first error passed to bind", async () => {
      const after = vi.fn();
      const error = new Error("rejected");

      const result = await genAsync(async function* () {
        const a = yield* bind(await fromAsync(Promise.reject(error)));
        after();
        return ok(a);
      });

      expect(result).toEqual([error, null]);
      expect(after).not.toHaveBeenCalled();
    });

    it("should return an async result the body returns", async () => {
      const result = await genAsync(async function* () {
        const a = yield* bind(toNumber("21"));
        return await fetchNumber(String(a * 2));
      });

      expect(result).toEqual([null, 42]);
    });

    it("should run finally blocks when an error short-circuits", async () => {
      const cleanup = vi.fn();

      await genAsync(async function* () {
        try {
          yield* bind(err("boom"));
          return ok();
        } finally {
          await Promise.resolve();
          cleanup();
        }
      });

      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("should reject with what the body throws", async () => {
      await expect(
        genAsync(async function* () {
          yield* bind(ok(1));
          throw new Error("thrown");
        }),
      ).rejects.toThrow("thrown");
    });

    it("should infer the union of every error the body can produce", async () => {
      const result = await genAsync(async function* () {
        const a = yield* bind(await fetchNumber("1"));
        const b = yield* bind(positive(a));
        return ok(b);
      });

      expectTypeOf(result).toMatchTypeOf<
        Result<number, Error | "NOT_POSITIVE">
      >();
    });
  });

  describe("genFn", () => {
    const parsePort = genFn(function* (raw: string) {
      const port = yield* bind(toNumber(raw));
      if (port < 1 || port > 65535) return err("OUT_OF_RANGE" as const);
      return ok(port);
    });

    it("should pass its arguments to the body", () => {
      expect(parsePort("8080")).toEqual([null, 8080]);
    });

    it("should return the first error passed to bind", () => {
      expect(parsePort("nope")).toEqual(["NOT_A_NUMBER", null]);
    });

    it("should return an error result the body returns", () => {
      expect(parsePort("70000")).toEqual(["OUT_OF_RANGE", null]);
    });

    it("should run the body anew on every call", () => {
      const body = vi.fn(function* () {
        return ok();
      });
      const fn = genFn(body);

      fn();
      fn();

      expect(body).toHaveBeenCalledTimes(2);
    });

    it("should infer the parameters and the result", () => {
      expectTypeOf(parsePort).parameters.toEqualTypeOf<[raw: string]>();
      expectTypeOf(parsePort).returns.toMatchTypeOf<
        Result<number, "NOT_A_NUMBER" | "OUT_OF_RANGE">
      >();
    });
  });

  describe("genAsyncFn", () => {
    const add = genAsyncFn(async function* (a: number, b: Promise<number>) {
      const resolved = yield* bindAsyncFrom(b);
      const sum = yield* bind(positive(a + resolved));
      return ok(sum);
    });

    it("should pass its arguments to the body", async () => {
      expect(await add(20, Promise.resolve(22))).toEqual([null, 42]);
    });

    it("should return the first error passed to bind", async () => {
      const error = new Error("rejected");
      expect(await add(1, Promise.reject(error))).toEqual([error, null]);
      expect(await add(-5, Promise.resolve(1))).toEqual(["NOT_POSITIVE", null]);
    });

    it("should reject with what the body throws", async () => {
      const fn = genAsyncFn(async function* () {
        yield* bind(ok());
        throw new Error("thrown");
      });

      await expect(fn()).rejects.toThrow("thrown");
    });

    it("should infer the parameters and the result", () => {
      expectTypeOf(add).parameters.toEqualTypeOf<
        [a: number, b: Promise<number>]
      >();
      expectTypeOf(add).returns.resolves.toMatchTypeOf<
        Result<number, Error | "NOT_POSITIVE">
      >();
    });
  });
});
