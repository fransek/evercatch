import { describe, expect, it } from "vitest";
import { createErr } from "./result";
import { ResultAsync } from "./types";
import { fromAsyncThrowable, safeAsync, unsafeAsync } from "./utils-async";

describe("utils-async.ts", () => {
  describe("safeAsync", () => {
    it("should return a ResultOk when the promise resolves", async () => {
      const promise = Promise.resolve("test");
      const [error, value] = await safeAsync(promise, "ERROR_LABEL");
      expect(error).toBeNull();
      expect(value).toBe("test");
    });

    it("should return a ResultErr when the promise rejects", async () => {
      const error = new Error("Test error");
      const promise = Promise.reject(error);
      const [err, value] = await safeAsync(promise, "ERROR_LABEL");
      expect(err).toEqual(createErr("ERROR_LABEL", { source: error }));
      expect(value).toBeNull();
    });
  });

  describe("unsafeAsync", () => {
    it("should return the value when the ResultAsync is a ResultOk", async () => {
      const result: ResultAsync<string> = Promise.resolve([null, "test"]);
      const value = await unsafeAsync(result);
      expect(value).toBe("test");
    });

    it("should throw an error when the ResultAsync is a ResultErr", async () => {
      const err = createErr("ERROR_LABEL");
      const result: ResultAsync<string> = Promise.resolve([err, null]);
      await expect(unsafeAsync(result)).rejects.toEqual(err);
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
      const [error, value] = await safeFn(false);
      expect(error).toBeNull();
      expect(value).toBe("Success!");
    });

    it("should return a ResultErr when the async function throws an error", async () => {
      const [err, value] = await safeFn(true);
      expect(err).toEqual(createErr("ERROR_LABEL", { source: error }));
      expect(value).toBeNull();
    });
  });
});
