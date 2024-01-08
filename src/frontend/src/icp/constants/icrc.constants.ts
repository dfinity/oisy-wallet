import type { IcInterface } from '../types/ic';

export const CKBTC_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_LEDGER_CANISTER_ID as string | null | undefined) ??
	'mxzaz-hqaaa-aaaar-qaada-cai';

export const CKBTC_INDEX_CANISTER_ID =
	(import.meta.env.VITE_CKBTC_INDEX_CANISTER_ID as string | null | undefined) ??
	'n5wcd-faaaa-aaaar-qaaea-cai';

export const CKETH_LEDGER_CANISTER_ID =
	(import.meta.env.VITE_CKETH_LEDGER_CANISTER_ID as string | null | undefined) ??
	'ss2fx-dyaaa-aaaar-qacoq-cai';

export const CKETH_INDEX_CANISTER_ID =
	(import.meta.env.VITE_CKETH_INDEX_CANISTER_ID as string | null | undefined) ??
	's3zol-vqaaa-aaaar-qacpa-cai';

export const ICRC_CANISTERS: IcInterface[] = [
	{
		ledgerCanisterId: CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: CKBTC_INDEX_CANISTER_ID,
		exchangeCoinId: 'bitcoin'
	},
	{
		ledgerCanisterId: CKETH_LEDGER_CANISTER_ID,
		indexCanisterId: CKETH_INDEX_CANISTER_ID,
		exchangeCoinId: 'ethereum'
	}
];
