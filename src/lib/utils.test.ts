import { describe, expect, it } from "vitest";
import { Err } from "./result";
import { ResultAsync } from "./types";
import { fromAsyncThrowable, safeAsync, unsafeAsync } from "./utils-async";

describe("utils.ts", () => {
  describe("safeAsync", () => {
    it("should return a ResultOk when the promise resolves", async () => {
      const promise = Promise.resolve("test");
      const result = await safeAsync(promise, "ERROR_LABEL");
      expect(result).toEqual([null, "test"]);
    });

    it("should return a ResultErr when the promise rejects", async () => {
      const error = new Error("Test error");
      const promise = Promise.reject(error);
      const result = await safeAsync(promise, "ERROR_LABEL");
      expect(result).toEqual([Err.from(error, "ERROR_LABEL"), null]);
    });
  });

  describe("unsafeAsync", () => {
    it("should return the value when the ResultAsync is a ResultOk", async () => {
      const result: ResultAsync<string> = Promise.resolve([null, "test"]);
      const value = await unsafeAsync(result);
      expect(value).toBe("test");
    });

    it("should throw an error when the ResultAsync is a ResultErr", async () => {
      const result: ResultAsync<string> = Promise.resolve([
        new Err("ERROR_LABEL"),
        null,
      ]);
      await expect(() => unsafeAsync(result)).rejects.toThrowError(
        new Err("ERROR_LABEL"),
      );
    });
  });

  describe("fromAsyncThrowable", () => {
    const error = new Error("Error message");

    const fn = async (throwError: boolean) => {
      if (throwError) {
        throw error;
      }
      return "Success!";
    };

    const safeFn = fromAsyncThrowable(fn, "ERROR_LABEL");

    it("should return a ResultOk when the async function resolves successfully", async () => {
      const result = await safeFn(false);
      expect(result).toEqual([null, "Success!"]);
    });

    it("should return a ResultErr when the async function throws an error", async () => {
      const result = await safeFn(true);
      expect(result).toEqual([Err.from(error, "ERROR_LABEL"), null]);
    });
  });
});
