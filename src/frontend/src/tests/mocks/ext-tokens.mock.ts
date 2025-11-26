import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { ExtToken } from '$icp/types/ext-token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockExtV2TokenCanisterId } from '$tests/mocks/ext-v2-token.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidExtV2Token: ExtToken = {
	...mockValidToken,
	id: parseTokenId('ExtV2TokenId'),
	network: ICP_NETWORK,
	standard: 'extV2',
	canisterId: mockExtV2TokenCanisterId
};
