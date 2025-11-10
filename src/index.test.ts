import { describe, expect, it, vi } from "vitest";
import {
  err,
  fromAsyncThrowable,
  fromThrowable,
  ok,
  safe,
  safeAsync,
  type Result,
  type ResultAsync,
} from "./index";

describe("ok", () => {
  it("should create a successful result with value", () => {
    const result = ok(42);
    expect(result).toEqual([null, 42]);
  });

  it("should create a successful result with null when no value provided", () => {
    const result = ok();
    expect(result).toEqual([null, null]);
  });

  it("should create a successful result with provided null", () => {
    const result = ok(null);
    expect(result).toEqual([null, null]);
  });
});

describe("err", () => {
  it("should create an error result with error", () => {
    const error = new Error("test error");
    const result = err(error);
    expect(result).toEqual([error, null]);
  });

  it("should create an error result with default Error when no error provided", () => {
    const result = err();
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("safe", () => {
  it("should return ok result when function succeeds", () => {
    const result = safe(() => 42);
    expect(result).toEqual([null, 42]);
  });

  it("should return err result when function throws", () => {
    const result = safe(() => {
      throw new Error("test error");
    });
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should handle non-Error throwables", () => {
    const [error] = safe(() => {
      throw { message: "test error" };
    });
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("[object Object]");
    expect(error?.cause).toEqual({ message: "test error" });
    console.log(error);
  });

  it("should use transformError option", () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = safe(
      () => {
        throw "original";
      },
      { transformError },
    );
    expect(result).toEqual([expect.any(Error), null]);
    expect(transformError).toHaveBeenCalledWith("original");
  });

  it("should call onError callback", () => {
    const onError = vi.fn();
    const result = safe(
      () => {
        throw new Error("test");
      },
      { onError },
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("safeAsync", () => {
  it("should return ok result when promise resolves", async () => {
    const result = await safeAsync(Promise.resolve(42));
    expect(result).toEqual([null, 42]);
  });

  it("should return err result when promise rejects", async () => {
    const result = await safeAsync(Promise.reject(new Error("test error")));
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should use transformError option", async () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = await safeAsync(Promise.reject("original"), {
      transformError,
    });
    expect(result).toEqual([expect.any(Error), null]);
    expect(transformError).toHaveBeenCalledWith("original");
  });

  it("should call onError callback", async () => {
    const onError = vi.fn();
    const result = await safeAsync(Promise.reject(new Error("test")), {
      onError,
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("fromThrowable", () => {
  it("should wrap a function to return Result", () => {
    const fn = (x: number) => x * 2;
    const wrapped = fromThrowable(fn);
    const result = wrapped(5);
    expect(result).toEqual([null, 10]);
  });

  it("should catch errors in wrapped function", () => {
    const fn = () => {
      throw new Error("test");
    };
    const wrapped = fromThrowable(fn);
    const result = wrapped();
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should pass options to safe", () => {
    const onError = vi.fn();
    const fn = () => {
      throw new Error("test");
    };
    const wrapped = fromThrowable(fn, { onError });
    const result = wrapped();
    expect(onError).toHaveBeenCalled();
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("fromAsyncThrowable", () => {
  it("should wrap an async function to return ResultAsync", async () => {
    const fn = async (x: number) => x * 2;
    const wrapped = fromAsyncThrowable(fn);
    const result = await wrapped(5);
    expect(result).toEqual([null, 10]);
  });

  it("should catch errors in wrapped async function", async () => {
    const fn = async () => {
      throw new Error("test");
    };
    const wrapped = fromAsyncThrowable(fn);
    const result = await wrapped();
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should pass options to safeAsync", async () => {
    const onError = vi.fn();
    const fn = async () => {
      throw new Error("test");
    };
    const wrapped = fromAsyncThrowable(fn, { onError });
    const result = await wrapped();
    expect(onError).toHaveBeenCalled();
    expect(result).toEqual([expect.any(Error), null]);
  });
});

// Type tests (compile-time checks)
describe("Type checks", () => {
  it("should have correct types", () => {
    const success: Result<number, Error> = ok(42);
    const failure: Result<number, Error> = err(new Error("test"));

    expect(success[0]).toBe(null);
    expect(success[1]).toBe(42);
    expect(failure[0]).toBeInstanceOf(Error);
    expect(failure[1]).toBe(null);
  });

  it("should work with async results", async () => {
    const asyncSuccess: ResultAsync<string, Error> = safeAsync(
      Promise.resolve("hello"),
    );
    const result = await asyncSuccess;
    expect(result).toEqual([null, "hello"]);
  });
});
