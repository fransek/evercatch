export {
  fromAsyncThrowable,
  fromPromise,
  unwrapAsyncOr,
  unwrapAsyncOrElse,
  unwrapAsyncOrThrow,
} from "./async";
export { err, ok } from "./shared";
export {
  fromThrowable,
  resultFrom,
  unwrapOr,
  unwrapOrElse,
  unwrapOrThrow,
} from "./sync";
export type {
  Falsy,
  Result,
  ResultAsync,
  ResultAsyncFn,
  ResultErr,
  ResultFn,
  ResultOk,
  Truthy,
} from "./types";
