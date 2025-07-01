import { describe, expect, it } from "vitest";
import { err, ok } from "./result";
import { fromAsyncThrowable, safeAsync, unsafeAsync } from "./utils-async";

class CustomError extends Error {
  readonly name = "CustomError";
}

describe("utils-async", () => {
  describe("safeAsync", () => {
    it("should return ok result for resolved promise", async () => {
      const promise = Promise.resolve(42);
      const result = await safeAsync(promise);
      expect(result).toEqual(ok(42));
    });

    it("should return err result for rejected promise", async () => {
      const testError = new Error("test error");
      const promise = Promise.reject(testError);
      const [error] = await safeAsync(promise);
      expect(error).toBeInstanceOf(Error);
    });

    it("should use error factory when provided", async () => {
      const testError = new Error("test error");
      const promise = Promise.reject(testError);
      const factory = (error: unknown) =>
        new CustomError("Custom error", { cause: error });
      const [error, value] = await safeAsync(promise, factory);
      expect(error).toBeInstanceOf(CustomError);
      expect(error?.cause).toBe(testError);
      expect(value).toBeNull();
    });
  });

  describe("unsafeAsync", () => {
    it("should return value for ok result", async () => {
      const result = Promise.resolve(ok(42));
      const value = await unsafeAsync(result);
      expect(value).toBe(42);
    });

    it("should throw error for err result", async () => {
      const error = new Error("test error");
      const result = Promise.resolve(err(error));
      await expect(unsafeAsync(result)).rejects.toThrow(error);
    });
  });

  describe("fromAsyncThrowable", () => {
    it("should wrap successful async function", async () => {
      const fn = async (x: number) => x * 2;
      const safeFn = fromAsyncThrowable(fn);
      const result = await safeFn(21);
      expect(result).toEqual(ok(42));
    });

    it("should handle errors in async function", async () => {
      const fn = async () => {
        throw new Error("test error");
      };
      const safeFn = fromAsyncThrowable(fn);
      const [error] = await safeFn();
      expect(error).toBeInstanceOf(Error);
    });

    it("should use error factory when provided", async () => {
      const testError = new Error("test error");
      const fn = async () => {
        throw testError;
      };
      const factory = (error: unknown) =>
        new CustomError("Custom error", { cause: error });
      const safeFn = fromAsyncThrowable(fn, factory);
      const [error, value] = await safeFn();
      expect(error).toBeInstanceOf(CustomError);
      expect(error?.cause).toEqual(testError);
      expect(value).toBeNull();
    });
  });
});
