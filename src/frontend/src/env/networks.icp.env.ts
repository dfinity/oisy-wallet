import { LOCAL } from '$lib/constants/app.constants';
import type { OptionalNullableCanisterIdText } from '$lib/types/canister';

export const ICP_LEDGER_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_LEDGER_CANISTER_ID as OptionalNullableCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_LEDGER_CANISTER_ID as OptionalNullableCanisterIdText)) ??
	'ryjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_INDEX_CANISTER_ID as OptionalNullableCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_INDEX_CANISTER_ID as OptionalNullableCanisterIdText)) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';
