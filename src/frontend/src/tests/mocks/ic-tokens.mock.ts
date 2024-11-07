import { IC_CKBTC_INDEX_CANISTER_ID, IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks.icrc.env';
import type { IcCanisters, IcToken } from '$icp/types/ic-token';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidIcCanisters: IcCanisters = {
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	// TODO: to be removed when indexCanisterId becomes optional
	indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID
};

export const mockValidIcToken: IcToken = {
	...mockValidToken,
	...mockValidIcCanisters,
	fee: 123n,
	position: 1
};
