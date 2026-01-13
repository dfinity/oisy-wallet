import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { ExtToken } from '$icp/types/ext-token';
import type { CanisterIdText } from '$lib/types/canister';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

// TODO: Find some DIP721 examples; the canisters below belong to other standards.
export const mockDip721TokenCanisterId: CanisterIdText = 'qcg3w-tyaaa-aaaah-qakea-cai';
export const mockDip721TokenCanisterId2: CanisterIdText = '4nvhy-3qaaa-aaaah-qcnoq-cai';
export const mockDip721TokenCanisterId3: CanisterIdText = 'fl5nr-xiaaa-aaaai-qbjmq-cai';

export const mockValidDip721Token: ExtToken = {
	...mockValidToken,
	id: parseTokenId('Dip721TokenId'),
	network: ICP_NETWORK,
	standard: { code: 'dip721' },
	canisterId: mockDip721TokenCanisterId
};
