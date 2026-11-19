import { nonNullish } from '@dfinity/utils';

// The memo of the mint that refunds a top-up whose deposit failed (`dfinity/cycles-ledger`,
// `storage.rs`, `PENALIZE_MEMO`).
const TOP_UP_REFUND_MEMO_BYTE = 0xff;
const TOP_UP_REFUND_MEMO_LENGTH = 32;

export const isTopUpRefundMemo = (memo: Uint8Array | undefined): boolean =>
	nonNullish(memo) &&
	memo.length === TOP_UP_REFUND_MEMO_LENGTH &&
	memo.every((byte) => byte === TOP_UP_REFUND_MEMO_BYTE);
