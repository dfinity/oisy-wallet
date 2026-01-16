import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import type { IcCanisters, IcCkToken, IcToken } from '$icp/types/ic-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIcrcAccount } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockLedgerCanisterId = IC_CKBTC_LEDGER_CANISTER_ID;
export const mockIndexCanisterId = IC_CKBTC_INDEX_CANISTER_ID;

export const mockValidIcCanisters: IcCanisters = {
	ledgerCanisterId: mockLedgerCanisterId
};

export const mockValidIcToken: IcToken = {
	...mockValidToken,
	...mockValidIcCanisters,
	mintingAccount: mockIcrcAccount,
	fee: 123n
};

export const mockValidIcrcToken: IcToken = {
	...mockValidIcToken,
	id: parseTokenId('IcrcTokenId'),
	standard: { code: 'icrc' }
};

export const mockValidDip20Token: IcToken = {
	...mockValidIcToken,
	id: parseTokenId('Dip20TokenId'),
	standard: { code: 'dip20' }
};

export const mockValidIcCkToken: IcCkToken = {
	...mockValidIcToken,
	twinToken: { ...mockValidToken, standard: { code: 'erc20' } },
	feeLedgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
	minterCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
};
