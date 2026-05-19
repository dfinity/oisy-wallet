import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { Icrc7Token } from '$icp/types/icrc7-token';
import type { CanisterIdText } from '$lib/types/canister';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockIcrc7CanisterId: CanisterIdText = 'aaaaa-aa';
export const mockIcrc7CanisterId2: CanisterIdText = 'mxzaz-hqaaa-aaaar-qaada-cai';

export const mockValidIcrc7Token: Icrc7Token = {
	...mockValidToken,
	id: parseTokenId('Icrc7TokenId'),
	network: ICP_NETWORK,
	standard: { code: 'icrc7' },
	canisterId: mockIcrc7CanisterId
};
