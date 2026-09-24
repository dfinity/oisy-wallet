import type { IcToken } from '$icp/types/ic-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

// The mainnet cycles ledger's token, the one the CMC mints into.
export const mockTcyclesToken: IcToken = {
	...mockValidIcrcToken,
	id: parseTokenId('TcyclesTokenId'),
	symbol: 'TCYCLES',
	name: 'Trillion Cycles',
	decimals: 12,
	fee: 100_000_000n,
	ledgerCanisterId: 'um5iw-rqaaa-aaaaq-qaaba-cai'
};

// 4.5 XDR per ICP: 1 ICP mints 4.5 TCYCLES.
export const mockXdrPermyriadPerIcp = 45_000n;
