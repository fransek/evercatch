import { describe, expect, it, vi } from "vitest";
import {
  err,
  fromAsyncThrowable,
  fromThrowable,
  ok,
  resultFrom,
  resultFromPromise,
  safe,
  safeAsync,
  unsafeUnwrap,
  unsafeUnwrapAsync,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
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

describe("resultFrom", () => {
  it("should return ok result when function succeeds", () => {
    const result = resultFrom(() => 42);
    expect(result).toEqual([null, 42]);
  });

  it("should return err result when function throws", () => {
    const result = resultFrom(() => {
      throw new Error("test error");
    });
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should handle non-Error throwables", () => {
    const [error] = resultFrom(() => {
      throw { message: "test error" };
    });
    expect(error).toBeInstanceOf(Error);
    expect(error?.cause).toEqual({ message: "test error" });
  });

  it("should use transformError option", () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = resultFrom(
      () => {
        throw "original";
      },
      { mapErr: transformError },
    );
    expect(result).toEqual([expect.any(Error), null]);
    expect(transformError).toHaveBeenCalledWith("original");
  });

  it("should support deprecated transformError option", () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = resultFrom(
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
    const result = resultFrom(
      () => {
        throw new Error("test");
      },
      { tapErr: onError },
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should support deprecated onError callback", () => {
    const onError = vi.fn();
    const result = resultFrom(
      () => {
        throw new Error("test");
      },
      { onError },
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("resultFromPromise", () => {
  it("should return ok result when promise resolves", async () => {
    const result = await resultFromPromise(Promise.resolve(42));
    expect(result).toEqual([null, 42]);
  });

  it("should return err result when promise rejects", async () => {
    const result = await resultFromPromise(
      Promise.reject(new Error("test error")),
    );
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should use transformError option", async () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = await resultFromPromise(Promise.reject("original"), {
      mapErr: transformError,
    });
    expect(result).toEqual([expect.any(Error), null]);
    expect(transformError).toHaveBeenCalledWith("original");
  });

  it("should support deprecated transformError option", async () => {
    const transformError = vi.fn(() => new Error("transformed"));
    const result = await resultFromPromise(Promise.reject("original"), {
      transformError,
    });
    expect(result).toEqual([expect.any(Error), null]);
    expect(transformError).toHaveBeenCalledWith("original");
  });

  it("should call onError callback", async () => {
    const onError = vi.fn();
    const result = await resultFromPromise(Promise.reject(new Error("test")), {
      tapErr: onError,
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual([expect.any(Error), null]);
  });

  it("should support deprecated onError callback", async () => {
    const onError = vi.fn();
    const result = await resultFromPromise(Promise.reject(new Error("test")), {
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

  it("should pass options to resultFrom", () => {
    const onError = vi.fn();
    const fn = () => {
      throw new Error("test");
    };
    const wrapped = fromThrowable(fn, { tapErr: onError });
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

  it("should pass options to resultFromPromise", async () => {
    const onError = vi.fn();
    const fn = async () => {
      throw new Error("test");
    };
    const wrapped = fromAsyncThrowable(fn, { tapErr: onError });
    const result = await wrapped();
    expect(onError).toHaveBeenCalled();
    expect(result).toEqual([expect.any(Error), null]);
  });
});

describe("unwrapOrThrow", () => {
  it("should return the value when result is ok", () => {
    const result = ok(42);
    const value = unwrapOrThrow(result);
    expect(value).toBe(42);
  });

  it("should throw the error when result is err", () => {
    const error = new Error("test error");
    const result = err(error);
    expect(() => unwrapOrThrow(result)).toThrow(error);
  });
});

describe("unwrapAsyncOrThrow", () => {
  it("should return the value when result is ok", async () => {
    const result = ok(42);
    const value = await unwrapAsyncOrThrow(Promise.resolve(result));
    expect(value).toBe(42);
  });

  it("should throw the error when result is err", async () => {
    const error = new Error("test error");
    const result = err(error);
    await expect(unwrapAsyncOrThrow(Promise.resolve(result))).rejects.toThrow(
      error,
    );
  });
});

describe("unwrapOr", () => {
  it("should return the value when result is ok", () => {
    const result = ok(42);
    const value = unwrapOr(result, 0);
    expect(value).toBe(42);
  });

  it("should return the fallback when result is err", () => {
    const result = err(new Error("test error"));
    const value = unwrapOr(result, 0);
    expect(value).toBe(0);
  });
});

describe("unwrapAsyncOr", () => {
  it("should return the value when result is ok", async () => {
    const result = ok(42);
    const value = await unwrapAsyncOr(Promise.resolve(result), 0);
    expect(value).toBe(42);
  });

  it("should return the fallback when result is err", async () => {
    const result = err(new Error("test error"));
    const value = await unwrapAsyncOr(Promise.resolve(result), 0);
    expect(value).toBe(0);
  });
});

describe("unwrapOrElse", () => {
  it("should return the value when result is ok without calling fallback", () => {
    const fallbackFn = vi.fn(() => 0);
    const result = ok(42);

    const value = unwrapOrElse(result, fallbackFn);

    expect(value).toBe(42);
    expect(fallbackFn).not.toHaveBeenCalled();
  });

  it("should return the computed fallback when result is err", () => {
    const error = new Error("test error");
    const fallbackFn = vi.fn((err: Error) => err.message.length);

    const value = unwrapOrElse(err(error), fallbackFn);

    expect(value).toBe("test error".length);
    expect(fallbackFn).toHaveBeenCalledWith(error);
  });
});

describe("unwrapAsyncOrElse", () => {
  it("should return the value when result is ok without calling fallback", async () => {
    const fallbackFn = vi.fn(() => 0);
    const result = ok(42);

    const value = await unwrapAsyncOrElse(Promise.resolve(result), fallbackFn);

    expect(value).toBe(42);
    expect(fallbackFn).not.toHaveBeenCalled();
  });

  it("should return the computed fallback when result is err", async () => {
    const error = new Error("test error");
    const fallbackFn = vi.fn((err: Error) => err.message.length);

    const value = await unwrapAsyncOrElse(
      Promise.resolve(err(error)),
      fallbackFn,
    );

    expect(value).toBe("test error".length);
    expect(fallbackFn).toHaveBeenCalledWith(error);
  });
});

describe("deprecated aliases", () => {
  it("should keep safe pointing to resultFrom", () => {
    expect(safe).toBe(resultFrom);
  });

  it("should keep safeAsync pointing to resultFromPromise", () => {
    expect(safeAsync).toBe(resultFromPromise);
  });

  it("should keep unsafeUnwrap pointing to unwrapOrThrow", () => {
    expect(unsafeUnwrap).toBe(unwrapOrThrow);
  });

  it("should keep unsafeUnwrapAsync pointing to unwrapAsyncOrThrow", () => {
    expect(unsafeUnwrapAsync).toBe(unwrapAsyncOrThrow);
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
    const asyncSuccess: ResultAsync<string, Error> = resultFromPromise(
      Promise.resolve("hello"),
    );
    const result = await asyncSuccess;
    expect(result).toEqual([null, "hello"]);
  });
});
