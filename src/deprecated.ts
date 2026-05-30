import { resultFromPromise, unwrapAsyncOrThrow } from "./async";
import { resultFrom, unwrapOrThrow } from "./sync";

/**
 * @deprecated Use `resultFrom` instead.
 */
export const safe = resultFrom;

/**
 * @deprecated Use `resultFromPromise` instead.
 */
export const safeAsync = resultFromPromise;

/**
 * @deprecated Use `unwrapOrThrow` instead.
 */
export const unsafeUnwrap = unwrapOrThrow;

/**
 * @deprecated Use `unwrapAsyncOrThrow` instead.
 */
export const unsafeUnwrapAsync = unwrapAsyncOrThrow;
