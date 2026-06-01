import { describe, expect, it } from "vitest";

import { err, ok } from "./shared";

describe("shared", () => {
  describe("ok", () => {
    it("should create a successful result with value", () => {
      expect(ok(42)).toEqual([null, 42]);
    });

    it("should create a successful result with null when no value provided", () => {
      expect(ok()).toEqual([null, null]);
    });

    it("should create a successful result with provided null", () => {
      expect(ok(null)).toEqual([null, null]);
    });
  });

  describe("err", () => {
    it("should create an error result with error", () => {
      const error = new Error("test error");
      expect(err(error)).toEqual([error, null]);
    });

    it("should create an error result with default Error when no error provided", () => {
      expect(err()).toEqual([expect.any(Error), null]);
    });
  });
});
