import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { Icrc7Token } from '$icp/types/icrc7-token';
import type { CanisterIdText } from '$lib/types/canister';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

// Cosmicrafts Avatars — used as a reference ICRC-7 deployment for tests.
export const mockIcrc7CanisterId: CanisterIdText = 'xea2t-daaaa-aaaaj-qnp2a-cai';

export const mockValidIcrc7Token: Icrc7Token = {
	...mockValidToken,
	id: parseTokenId('Icrc7TokenId'),
	network: ICP_NETWORK,
	standard: { code: 'icrc7' },
	canisterId: mockIcrc7CanisterId
};
