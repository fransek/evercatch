/* eslint-disable @typescript-eslint/no-explicit-any */
import { err, Err, ok } from "./result";
import { Result, ResultFn } from "./types";

export const safe = <T, E extends string>(
  fn: () => T,
  label: E,
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(Err.from(error, label));
  }
};

export const unsafe = <T, E extends string>(result: Result<T, E>): T => {
  const [error, value] = result;
  if (error) {
    throw error;
  }
  return value;
};

export const fromThrowable = <TArgs extends any[], T, E extends string>(
  fn: (...args: TArgs) => T,
  label: E,
): ResultFn<TArgs, T, E> => {
  return (...args: TArgs): Result<T, E> => {
    return safe(() => fn(...args), label);
  };
};
