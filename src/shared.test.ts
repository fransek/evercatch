import { describe, expect, expectTypeOf, it } from "vitest";

import { err, isErr, isOk, ok } from "./shared";
import type { Result, ResultErr, ResultOk } from "./types";

describe("shared", () => {
  describe("ok", () => {
    it("should create a successful result with value", () => {
      expect(ok(42)).toEqual([null, 42]);
    });

    it("should create a successful result with undefined when no value provided", () => {
      const result = ok();

      expect(result).toEqual([null, undefined]);
      expect(result[1]).toBe(undefined);
      expectTypeOf(result).toEqualTypeOf<ResultOk<undefined>>();
    });

    it("should pass through an explicit undefined", () => {
      const result = ok(undefined);

      expect(result).toEqual([null, undefined]);
      expect(result[1]).toBe(undefined);
      expectTypeOf(result).toEqualTypeOf<ResultOk<undefined>>();
    });

    it("should create a successful result with provided null", () => {
      const result = ok(null);

      expect(result).toEqual([null, null]);
      expect(result[1]).toBe(null);
      expectTypeOf(result).toEqualTypeOf<ResultOk<null>>();
    });

    it("should pass through other falsy values", () => {
      expect(ok(0)).toEqual([null, 0]);
      expect(ok("")).toEqual([null, ""]);
      expect(ok(false)).toEqual([null, false]);
      expect(ok(NaN)[1]).toBeNaN();
    });
  });

  describe("err", () => {
    it("should create an error result with error", () => {
      const error = new Error("test error");
      expect(err(error)).toEqual([error, null]);
    });

    it("should create an error result with default Error when no error provided", () => {
      const result = err();

      expect(result).toEqual([expect.any(Error), null]);
      expectTypeOf(result).toEqualTypeOf<ResultErr<Error>>();
    });

    it("should reject nullish errors", () => {
      // @ts-expect-error null means "no error"
      expect(err(null)).toEqual([expect.any(Error), null]);
      // @ts-expect-error undefined means "no error was passed"
      expect(err(undefined)).toEqual([expect.any(Error), null]);

      const maybeNull: Error | null = null;
      // @ts-expect-error a possibly null error is not a valid error
      expect(err(maybeNull)).toEqual([expect.any(Error), null]);

      const maybeUndefined: Error | undefined = undefined;
      // @ts-expect-error a possibly undefined error is not a valid error
      expect(err(maybeUndefined)).toEqual([expect.any(Error), null]);
    });

    it("should pass through falsy errors that are not nullish", () => {
      expect(err(0)).toEqual([0, null]);
      expect(err("")).toEqual(["", null]);
      expect(err(false)).toEqual([false, null]);
      expect(err(0n)).toEqual([0n, null]);
      expect(err(NaN)[0]).toBeNaN();
    });

    it("should accept errors of any type", () => {
      expect(err("boom")).toEqual(["boom", null]);
      expect(err(404)).toEqual([404, null]);
      expect(err({ code: "DB" })).toEqual([{ code: "DB" }, null]);
    });
  });

  describe("isOk", () => {
    it("should return true for ok results, including nullish values", () => {
      expect(isOk(ok(42))).toBe(true);
      expect(isOk(ok(null))).toBe(true);
      expect(isOk(ok())).toBe(true);
    });

    it("should return false for err results, including falsy errors", () => {
      expect(isOk(err(new Error("Oops")))).toBe(false);
      for (const error of [0, "", false, 0n]) {
        expect(isOk(err(error))).toBe(false);
      }
    });

    it("should narrow the result to ResultOk", () => {
      const result = ok(42) as Result<number, 0 | "">;

      if (isOk(result)) {
        expectTypeOf(result).toEqualTypeOf<ResultOk<number>>();
        expectTypeOf(result[1]).toEqualTypeOf<number>();
      } else {
        expectTypeOf(result).toEqualTypeOf<ResultErr<0 | "">>();
      }
    });

    it("should narrow when used as a filter predicate", () => {
      const results: Result<number, string>[] = [ok(1), err("Oops"), ok(2)];
      const oks = results.filter(isOk);

      expect(oks).toEqual([ok(1), ok(2)]);
      expectTypeOf(oks).toEqualTypeOf<ResultOk<number>[]>();
    });
  });

  describe("isErr", () => {
    it("should return true for err results, including falsy errors", () => {
      expect(isErr(err(new Error("Oops")))).toBe(true);
      expect(isErr(err())).toBe(true);
      for (const error of [0, "", false, 0n]) {
        expect(isErr(err(error))).toBe(true);
      }
    });

    it("should return false for ok results, including nullish values", () => {
      expect(isErr(ok(42))).toBe(false);
      expect(isErr(ok(null))).toBe(false);
      expect(isErr(ok())).toBe(false);
    });

    it("should narrow the result to ResultErr", () => {
      const result = err("") as Result<number, 0 | "">;

      if (isErr(result)) {
        expectTypeOf(result).toEqualTypeOf<ResultErr<0 | "">>();
        expectTypeOf(result[0]).toEqualTypeOf<0 | "">();
      } else {
        expectTypeOf(result).toEqualTypeOf<ResultOk<number>>();
      }
    });

    it("should narrow when used as a filter predicate", () => {
      const results: Result<number, string>[] = [ok(1), err("Oops"), ok(2)];
      const errs = results.filter(isErr);

      expect(errs).toEqual([err("Oops")]);
      expectTypeOf(errs).toEqualTypeOf<ResultErr<string>[]>();
    });
  });
});
