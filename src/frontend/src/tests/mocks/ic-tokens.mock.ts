import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import type { IcCanisters, IcCkToken, IcToken } from '$icp/types/ic-token';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockLedgerCanisterId = IC_CKBTC_LEDGER_CANISTER_ID;
export const mockIndexCanisterId = IC_CKBTC_INDEX_CANISTER_ID;

export const mockValidIcCanisters: IcCanisters = {
	ledgerCanisterId: mockLedgerCanisterId
};

export const mockValidIcToken: IcToken = {
	...mockValidToken,
	...mockValidIcCanisters,
	fee: 123n,
	position: 1
};

export const mockValidIcCkToken: IcCkToken = {
	...mockValidIcToken,
	twinToken: mockValidToken,
	feeLedgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	minterCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
};
