import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { err, ok } from "./shared";
import {
  all,
  andThen,
  collect,
  fromNullable,
  fromThrowable,
  gen,
  map,
  mapErr,
  match,
  orElse,
  resultFrom,
  tap,
  tapErr,
  toNullable,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";
import type { Result, ResultOk } from "./types";

describe("sync", () => {
  describe("resultFrom", () => {
    it("should return ok result when function succeeds", () => {
      expect(resultFrom(() => 42)).toEqual([null, 42]);
    });

    it("should return err result when function throws", () => {
      expect(
        resultFrom(() => {
          throw new Error("test error");
        }),
      ).toEqual([expect.any(Error), null]);
    });

    it("should handle non-Error throwables", () => {
      const [error] = resultFrom(() => {
        throw { message: "test error" };
      });

      expect(error).toBeInstanceOf(Error);
      expect(error?.cause).toEqual({ message: "test error" });
    });

    it("should use mapErr", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));

      const result = resultFrom(() => {
        throw "original";
      }, mapErr);

      expect(result).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("original");
    });
  });

  describe("fromThrowable", () => {
    it("should wrap a function to return Result", () => {
      const wrapped = fromThrowable((value: number) => value * 2);
      expect(wrapped(5)).toEqual([null, 10]);
    });

    it("should catch errors in wrapped function", () => {
      const wrapped = fromThrowable(() => {
        throw new Error("test");
      });

      expect(wrapped()).toEqual([expect.any(Error), null]);
    });

    it("should pass mapErr to resultFrom", () => {
      const mapErr = vi.fn((value: unknown) => new Error(String(value)));
      const wrapped = fromThrowable(() => {
        throw "test";
      }, mapErr);

      expect(wrapped()).toEqual([expect.any(Error), null]);
      expect(mapErr).toHaveBeenCalledWith("test");
    });
  });

  describe("unwrapOrThrow", () => {
    it("should return the value when result is ok", () => {
      expect(unwrapOrThrow(ok(42))).toBe(42);
    });

    it("should throw the error when result is err", () => {
      const error = new Error("test error");
      expect(() => unwrapOrThrow(err(error))).toThrow(error);
    });

    it("should throw falsy errors that are not nullish", () => {
      for (const error of [0, "", false, 0n]) {
        expect(() => unwrapOrThrow(err(error))).toThrow();
        try {
          unwrapOrThrow(err(error));
        } catch (thrown) {
          expect(thrown).toBe(error);
        }
      }
    });
  });

  describe("unwrapOr", () => {
    it("should return the value when result is ok", () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it("should return the fallback when result is err", () => {
      expect(unwrapOr(err(new Error("test error")), 0)).toBe(0);
    });

    it("should return the fallback when the error is falsy", () => {
      for (const error of [0, "", false, 0n]) {
        expect(unwrapOr(err(error), 1)).toBe(1);
      }
    });
  });

  describe("unwrapOrElse", () => {
    it("should return the value when result is ok without calling fallback", () => {
      const fallbackFn = vi.fn(() => 0);

      expect(unwrapOrElse(ok(42), fallbackFn)).toBe(42);
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it("should return the computed fallback when result is err", () => {
      const error = new Error("test error");
      const fallbackFn = vi.fn(
        (receivedError: Error) => receivedError.message.length,
      );

      expect(unwrapOrElse(err(error), fallbackFn)).toBe("test error".length);
      expect(fallbackFn).toHaveBeenCalledWith(error);
    });

    it("should call the fallback with a falsy error", () => {
      for (const error of [0, "", false, 0n]) {
        const fallbackFn = vi.fn(() => 1);

        expect(unwrapOrElse(err(error), fallbackFn)).toBe(1);
        expect(fallbackFn).toHaveBeenCalledWith(error);
      }
    });
  });
});

function parseNumber(raw: string): Result<number, "NAN"> {
  const value = Number(raw);
  return Number.isNaN(value) ? err("NAN" as const) : ok(value);
}

function positive(value: number): Result<number, "NEGATIVE"> {
  return value < 0 ? err("NEGATIVE" as const) : ok(value);
}

describe("sync combinators", () => {
  describe("map", () => {
    it("should transform the value of an ok result", () => {
      const result = map(parseNumber("4"), (value) => String(value * 2));

      expect(result).toEqual([null, "8"]);
      expectTypeOf(result).toEqualTypeOf<Result<string, "NAN">>();
    });

    it("should pass errors through without calling fn", () => {
      const fn = vi.fn();
      const result = parseNumber("x");

      expect(map(result, fn)).toBe(result);
      expect(fn).not.toHaveBeenCalled();
    });

    it("should treat falsy errors as errors", () => {
      const fn = vi.fn();

      expect(map(err(0), fn)).toEqual([0, null]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("mapErr", () => {
    it("should transform the error of an err result", () => {
      const result = mapErr(parseNumber("x"), (error) => ({ code: error }));

      expect(result).toEqual([{ code: "NAN" }, null]);
      expectTypeOf(result).toEqualTypeOf<Result<number, { code: "NAN" }>>();
    });

    it("should pass ok results through without calling fn", () => {
      const fn = vi.fn(() => "mapped");
      const result = parseNumber("4");

      expect(mapErr(result, fn)).toBe(result);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("andThen", () => {
    it("should chain a result-returning function", () => {
      const result = andThen(parseNumber("4"), positive);

      expect(result).toEqual([null, 4]);
      expectTypeOf(result).toEqualTypeOf<Result<number, "NAN" | "NEGATIVE">>();
    });

    it("should return the error from the chained function", () => {
      expect(andThen(parseNumber("-1"), positive)).toEqual(["NEGATIVE", null]);
    });

    it("should short circuit on the first error", () => {
      const fn = vi.fn(positive);

      expect(andThen(parseNumber("x"), fn)).toEqual(["NAN", null]);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("orElse", () => {
    it("should recover from an error", () => {
      const result = orElse(parseNumber("x"), () => ok("default"));

      expect(result).toEqual([null, "default"]);
      expectTypeOf(result).toEqualTypeOf<Result<number | string, never>>();
    });

    it("should pass ok results through without calling fn", () => {
      const fn = vi.fn();
      const result = parseNumber("4");

      expect(orElse(result, fn)).toBe(result);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("tap and tapErr", () => {
    it("should call tap with the value and return the same result", () => {
      const fn = vi.fn();
      const result = parseNumber("4");

      expect(tap(result, fn)).toBe(result);
      expect(fn).toHaveBeenCalledWith(4);
      tap(parseNumber("x"), fn);
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should call tapErr with the error and return the same result", () => {
      const fn = vi.fn();
      const result = err(0);

      expect(tapErr(result, fn)).toBe(result);
      expect(fn).toHaveBeenCalledWith(0);
      tapErr(parseNumber("4"), fn);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("match", () => {
    const handlers = {
      ok: (value: number) => `ok: ${value}`,
      err: (error: "NAN") => `err: ${error}`,
    };

    it("should call the ok handler with the value", () => {
      expect(match(parseNumber("4"), handlers)).toBe("ok: 4");
    });

    it("should call the err handler with the error", () => {
      expect(match(parseNumber("x"), handlers)).toBe("err: NAN");
    });

    it("should return the union of both handler types", () => {
      const result = match(parseNumber("4"), {
        ok: (value) => value,
        err: () => null,
      });

      expectTypeOf(result).toEqualTypeOf<number | null>();
    });
  });

  describe("all", () => {
    it("should combine ok results into a tuple of values", () => {
      const result = all([ok(1), ok("two"), ok(true)]);

      expect(result).toEqual([null, [1, "two", true]]);
      expectTypeOf(result[1]).toEqualTypeOf<[number, string, boolean] | null>();
    });

    it("should return the first error in input order", () => {
      const result = all([parseNumber("1"), positive(-1), parseNumber("x")]);

      expect(result).toEqual(["NEGATIVE", null]);
      expectTypeOf(result[0]).toEqualTypeOf<"NAN" | "NEGATIVE" | null>();
    });

    it("should work on arrays", () => {
      const results = ["1", "2", "3"].map(parseNumber);
      const result = all(results);

      expect(result).toEqual([null, [1, 2, 3]]);
      expectTypeOf(result[1]).toEqualTypeOf<number[] | null>();
    });

    it("should return an empty array for no results", () => {
      expect(all([])).toEqual([null, []]);
    });

    it("should treat falsy errors as errors", () => {
      expect(all([ok(1), err("")])).toEqual(["", null]);
    });

    it("should be assignable to a Result", () => {
      const result: Result<[number, number], "NAN"> = all([
        parseNumber("1"),
        parseNumber("2"),
      ]);

      expect(result).toEqual([null, [1, 2]]);
    });
  });

  describe("collect", () => {
    it("should combine ok results into a tuple of values", () => {
      expect(collect([ok(1), ok("two")])).toEqual([null, [1, "two"]]);
    });

    it("should collect every error in input order", () => {
      const result = collect([
        parseNumber("x"),
        positive(1),
        positive(-1),
        parseNumber("y"),
      ]);

      expect(result).toEqual([["NAN", "NEGATIVE", "NAN"], null]);
      expectTypeOf(result[0]).toEqualTypeOf<("NAN" | "NEGATIVE")[] | null>();
    });
  });

  describe("gen", () => {
    it("should return the block's value as an ok result", () => {
      const result = gen(function* ($) {
        const a = yield* $(parseNumber("4"));
        const b = yield* $(positive(2));
        return a + b;
      });

      expect(result).toEqual([null, 6]);
      expectTypeOf(result).toEqualTypeOf<
        ResultOk<number> | readonly ["NAN" | "NEGATIVE", null]
      >();
    });

    it("should stop at the first error", () => {
      const after = vi.fn();

      const result = gen(function* ($) {
        const a = yield* $(parseNumber("x"));
        after();
        return a;
      });

      expect(result).toEqual(["NAN", null]);
      expect(after).not.toHaveBeenCalled();
    });

    it("should run finally blocks when stopping early", () => {
      const cleanup = vi.fn();

      gen(function* ($) {
        try {
          return yield* $(parseNumber("x"));
        } finally {
          cleanup();
        }
      });

      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("should treat falsy errors as errors", () => {
      const result = gen(function* ($) {
        return yield* $(err(0) as Result<number, 0>);
      });

      expect(result).toEqual([0, null]);
    });

    it("should have the error type never when nothing is yielded", () => {
      const result = gen(function* () {
        return 42;
      });

      expect(result).toEqual([null, 42]);
      expectTypeOf(result[0]).toEqualTypeOf<null>();
    });

    it("should not catch thrown errors", () => {
      expect(() =>
        gen(function* () {
          throw new Error("boom");
        }),
      ).toThrow("boom");
    });
  });

  describe("fromNullable", () => {
    it("should wrap non-nullish values, including falsy ones", () => {
      const result = fromNullable(0 as number | null);

      expect(result).toEqual([null, 0]);
      expectTypeOf(result).toEqualTypeOf<Result<number, Error>>();
      expect(fromNullable("")).toEqual([null, ""]);
    });

    it("should return a new Error for nullish values", () => {
      expect(fromNullable(null)).toEqual([expect.any(Error), null]);
      expect(fromNullable(undefined)).toEqual([expect.any(Error), null]);
    });

    it("should return the given error for nullish values", () => {
      const result = fromNullable(
        new Map<string, number>().get("a"),
        "NOT_FOUND" as const,
      );

      expect(result).toEqual(["NOT_FOUND", null]);
      expectTypeOf(result).toEqualTypeOf<Result<number, "NOT_FOUND">>();
    });
  });

  describe("toNullable", () => {
    it("should return the value of an ok result", () => {
      expect(toNullable(ok(42))).toBe(42);
    });

    it("should return null for an err result", () => {
      const result = toNullable(parseNumber("x"));

      expect(result).toBe(null);
      expectTypeOf(result).toEqualTypeOf<number | null>();
    });

    it("should treat falsy errors as errors", () => {
      expect(toNullable(err(false) as Result<number, false>)).toBe(null);
    });
  });
});
