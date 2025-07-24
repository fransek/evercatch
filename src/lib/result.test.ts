import { describe, expect, it } from "vitest";
import { createErr, err, ok } from "./result";

describe("result.ts", () => {
  describe("createErr", () => {
    it("should create an Err object with a source error", () => {
      const sourceError = new Error("Source error");
      const error = createErr("TEST_ERROR", sourceError);
      expect(error.label).toBe("TEST_ERROR");
      expect(error.source).toBe(sourceError);
    });

    it("should create an Err object with a default error if no source is provided", () => {
      const error = createErr("TEST_ERROR");
      expect(error.label).toBe("TEST_ERROR");
      expect(error.source).toBeInstanceOf(Error);
      expect((error.source as Error).message).toBe("TEST_ERROR");
    });
  });

  describe("ok", () => {
    it("should create a ResultOk tuple with a value", () => {
      const result = ok("Success");
      expect(result).toEqual([null, "Success"]);
    });

    it("should create a ResultOk tuple with null if no value is provided", () => {
      const result = ok();
      expect(result).toEqual([null, null]);
    });
  });

  describe("err", () => {
    it("should create a ResultErr tuple from a label and source", () => {
      const sourceError = new Error("Source error");
      const [error, value] = err("TEST_ERROR", sourceError);
      expect(error).toBeDefined();
      expect(value).toBeNull();
      expect(error?.label).toBe("TEST_ERROR");
      expect(error?.source).toBe(sourceError);
    });

    it("should create a ResultErr tuple from an existing Err object", () => {
      const existingErr = createErr("EXISTING_ERROR");
      const [error, value] = err(existingErr);
      expect(error).toBe(existingErr);
      expect(value).toBeNull();
    });
  });
});
