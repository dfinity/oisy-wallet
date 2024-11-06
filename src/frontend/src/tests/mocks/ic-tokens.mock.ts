import { IC_CKBTC_INDEX_CANISTER_ID, IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import type { IcCanisters, IcToken } from '$icp/types/ic-token';
import { validToken } from '$tests/mocks/tokens.mock';

export const validIcCanisters: IcCanisters = {
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	// TODO: to be removed when indexCanisterId becomes optional
	indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
};

export const validIcToken: IcToken = {
	...validToken,
	...validIcCanisters,
	fee: 123n,
	position: 1
};
