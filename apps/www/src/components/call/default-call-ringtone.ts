/** Served from `apps/www/public/`. */
export const DEFAULT_CALL_RINGTONE_SRC = "/incoming.wav";
/**
 * Outgoing "ringback" tone — what the caller hears while waiting for the
 * other user to accept. Stops as soon as the `answer` signal arrives (or the
 * call ends / times out). Served from `apps/www/public/`.
 */
export const DEFAULT_CALL_RINGBACK_SRC = "/outgoing.wav";
