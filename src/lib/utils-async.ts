/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, Err, ok } from "./result";
import { ResultAsync, ResultAsyncFn } from "./types";

export const safeAsync = async <T, E extends string>(
  promise: Promise<T>,
  label: E,
): ResultAsync<T, E> => {
  try {
    return ok(await promise);
  } catch (error) {
    return err(Err.from(error, label));
  }
};

export const unsafeAsync = async <T, E extends string>(
  result: ResultAsync<T, E>,
): Promise<T> => {
  const [error, value] = await result;
  if (error) {
    throw error;
  }
  return value;
};

export const fromAsyncThrowable = <TArgs extends any[], T, E extends string>(
  fn: (...args: TArgs) => Promise<T>,
  label: E,
): ResultAsyncFn<TArgs, T, E> => {
  return async (...args: TArgs): ResultAsync<T, E> => {
    return await safeAsync(fn(...args), label);
  };
};
