import { describe, expect, expectTypeOf, it } from "vitest";

import { err, ok } from "./shared";
import type { ResultErr, ResultOk } from "./types";

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

    it("should reject falsy errors", () => {
      // @ts-expect-error undefined is not a valid error
      expect(err(undefined)).toEqual([expect.any(Error), null]);
      // @ts-expect-error null is not a valid error
      expect(err(null)).toEqual([expect.any(Error), null]);
      // @ts-expect-error 0 is not a valid error
      expect(err(0)).toEqual([expect.any(Error), null]);
      // @ts-expect-error "" is not a valid error
      expect(err("")).toEqual([expect.any(Error), null]);
      // @ts-expect-error false is not a valid error
      expect(err(false)).toEqual([expect.any(Error), null]);
      // @ts-expect-error 0n is not a valid error
      expect(err(0n)).toEqual([expect.any(Error), null]);

      const maybeError: Error | null = null;
      // @ts-expect-error a possibly null error is not a valid error
      expect(err(maybeError)).toEqual([expect.any(Error), null]);
    });

    it("should replace a falsy error with a new Error at runtime", () => {
      // NaN is falsy but cannot be rejected by the type system
      expect(err(NaN)).toEqual([expect.any(Error), null]);
    });

    it("should accept truthy errors of any type", () => {
      expect(err("boom")).toEqual(["boom", null]);
      expect(err(404)).toEqual([404, null]);
      expect(err({ code: "DB" })).toEqual([{ code: "DB" }, null]);
    });
  });
});
