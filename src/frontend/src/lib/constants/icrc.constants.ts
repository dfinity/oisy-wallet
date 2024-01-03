import type { IcInterface } from '$lib/types/ic';

export const CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_LEDGER_CANISTER_ID as string | null | undefined) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_INDEX_CANISTER_ID as string | null | undefined) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const ICRC_CANISTERS: IcInterface[] = [
	{
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKBTC_INDEX_CANISTER_ID,
		exchangeCoinId: 'bitcoin'
	}
];
