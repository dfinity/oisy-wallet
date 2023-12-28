import type { CanisterIdText } from '$lib/types/canister';

export const ICP_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_ICP_LEDGER_CANISTER_ID as CanisterIdText | null | undefined) ??
	'ryjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(import.meta.env.VITE_ICP_INDEX_CANISTER_ID as CanisterIdText | null | undefined) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';

export const ICP_TRANSACTION_FEE_E8S = 10_000n;
