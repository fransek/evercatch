import { describe, expect, it } from "vitest";
import { err, ok } from "./result";
import { fromThrowable, safe, unsafe } from "./utils";

class CustomError extends Error {
  readonly name = "CustomError";
}

describe("utils", () => {
  describe("safe", () => {
    it("should return ok result for successful function", () => {
      const fn = () => 42;
      const result = safe(fn);
      expect(result).toEqual(ok(42));
    });

    it("should return err result for function that throws", () => {
      const testError = new Error("test error");
      const fn = () => {
        throw testError;
      };
      const [error] = safe(fn);
      expect(error).toBeInstanceOf(Error);
    });

    it("should use error factory when provided", () => {
      const testError = new Error("test error");
      const fn = () => {
        throw testError;
      };
      const factory = (error: unknown) =>
        new CustomError("Custom error", { cause: error });
      const [error, value] = safe(fn, factory);
      expect(error).toBeInstanceOf(CustomError);
      expect(error?.cause).toBe(testError);
      expect(value).toBeNull();
    });
  });

  describe("unsafe", () => {
    it("should return value for ok result", () => {
      const result = ok(42);
      const value = unsafe(result);
      expect(value).toBe(42);
    });

    it("should throw error for err result", () => {
      const error = new Error("test error");
      const result = err(error);
      expect(() => unsafe(result)).toThrow(error);
    });
  });

  describe("fromThrowable", () => {
    it("should wrap successful function", () => {
      const fn = (x: number) => x * 2;
      const safeFn = fromThrowable(fn);
      const result = safeFn(21);
      expect(result).toEqual(ok(42));
    });

    it("should handle errors in function", () => {
      const fn = () => {
        throw new Error("test error");
      };
      const safeFn = fromThrowable(fn);
      const [error] = safeFn();
      expect(error).toBeInstanceOf(Error);
    });

    it("should use error factory when provided", () => {
      const testError = new Error("test error");
      const fn = () => {
        throw testError;
      };
      const factory = (error: unknown) =>
        new CustomError("Custom error", { cause: error });
      const safeFn = fromThrowable(fn, factory);
      const [error, value] = safeFn();
      expect(error).toBeInstanceOf(CustomError);
      expect(error?.cause).toEqual(testError);
      expect(value).toBeNull();
    });
  });
});
