// Aliases for names that were renamed so the standalone exports follow one
// scheme. They will be removed in a future release.
import {
  fromAsync,
  tryAsyncOr,
  tryAsyncOrElse,
  tryAsyncOrThrow,
} from "./async";
import { fromSync } from "./sync";
import type { NonNullishError } from "./types";

/** @deprecated Renamed to {@link fromSync}. */
export const resultFrom = fromSync;
/** @deprecated Renamed to {@link fromAsync}. */
export const fromPromise = fromAsync;
/** @deprecated Renamed to {@link tryAsyncOr}. */
export const tryPromiseOr = tryAsyncOr;
/** @deprecated Renamed to {@link tryAsyncOrElse}. */
export const tryPromiseOrElse = tryAsyncOrElse;
/** @deprecated Renamed to {@link tryAsyncOrThrow}. */
export const tryPromiseOrThrow = tryAsyncOrThrow;
/** @deprecated Renamed to {@link NonNullishError}. */
export type NotNullish<E> = NonNullishError<E>;
