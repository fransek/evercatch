/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, errorFrom, ok } from "./result";
import { ResultAsync, ResultAsyncFn, ResultErr } from "./types";

export const safeAsync = async <T, E = Error>(
  promise: Promise<T>,
  factory?: (error: unknown) => E,
): ResultAsync<T, E> => {
  try {
    return ok(await promise);
  } catch (error) {
    if (factory) {
      return err(factory(error));
    }
    return err(errorFrom(error)) as ResultErr<E>;
  }
};

export const unsafeAsync = async <T, E>(
  result: ResultAsync<T, E>,
): Promise<T> => {
  const [error, value] = await result;
  if (error) {
    throw error;
  }
  return value as T;
};

export const fromAsyncThrowable = <A extends any[], T, E = Error>(
  fn: (...args: A) => Promise<T>,
  factory?: (error: unknown) => E,
): ResultAsyncFn<A, T, E> => {
  return async (...args: A): ResultAsync<T, E> => {
    return await safeAsync(fn(...args), factory);
  };
};
