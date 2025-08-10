import { describe, expect, it, vi } from "vitest";
import { Err, err, ok } from "./result";

describe("result.ts", () => {
  describe("Err", () => {
    it("should create an Err object with a source error", () => {
      const sourceError = new Error("Source error");
      const error = new Err("TEST_ERROR", sourceError);
      expect(error.label).toBe("TEST_ERROR");
      expect(error.source).toBe(sourceError);
    });

    it("should create an Err object with a default error if no source is provided", () => {
      const error = new Err("TEST_ERROR");
      expect(error.label).toBe("TEST_ERROR");
      expect(error.source).toBeInstanceOf(Error);
      expect((error.source as Error).message).toBe("TEST_ERROR");
    });

    describe("tap", () => {
      it("should perform a side effect and return the Err instance", () => {
        const error = new Err("TEST_ERROR");
        let sideEffectCalled = false;
        const returnedError = error.tap((e) => {
          sideEffectCalled = true;
          expect(e).toBe(error);
        });
        expect(sideEffectCalled).toBe(true);
        expect(returnedError).toBe(error);
      });
    });

    describe("setGlobalObserver and removeGlobalObserver", () => {
      it("should set and remove a global observer for Err instances", () => {
        const observer = vi.fn();
        Err.setGlobalObserver(observer);
        new Err("TEST_ERROR");
        Err.removeGlobalObserver();
        new Err("TEST_ERROR");
        expect(observer).toHaveBeenCalledTimes(1);
      });
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

    it("should create a ResultErr tuple from a label only", () => {
      const [error, value] = err("TEST_ERROR");
      expect(error).toBeDefined();
      expect(value).toBeNull();
      expect(error.label).toBe("TEST_ERROR");
      expect(error.source.message).toBe("TEST_ERROR");
    });
  });
});
