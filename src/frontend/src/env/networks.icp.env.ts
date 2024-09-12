import { LOCAL } from '$lib/constants/app.constants';
import type { OptionCanisterIdText } from '$lib/types/canister';

export const ICP_LEDGER_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)) ??
	'ryjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';
