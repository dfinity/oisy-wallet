import type { IcrcCanisters } from '$lib/types/icrc';

export const CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_LEDGER_CANISTER_ID as string | null | undefined) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_INDEX_CANISTER_ID as string | null | undefined) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const ICRC_CANISTERS: IcrcCanisters[] = [
	{
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKBTC_INDEX_CANISTER_ID
	}
];
