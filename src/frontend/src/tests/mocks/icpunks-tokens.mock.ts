import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { IcPunksToken } from '$icp/types/icpunks-token';
import type { CanisterIdText } from '$lib/types/canister';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockIcPunksCanisterId: CanisterIdText = 'qcg3w-tyaaa-aaaah-qakea-cai';
export const mockICatsCanisterId2: CanisterIdText = '4nvhy-3qaaa-aaaah-qcnoq-cai';

export const mockValidIcPunksToken: IcPunksToken = {
	...mockValidToken,
	id: parseTokenId('IcPunksTokenId'),
	network: ICP_NETWORK,
	standard: { code: 'icpunks' },
	canisterId: mockIcPunksCanisterId
};
