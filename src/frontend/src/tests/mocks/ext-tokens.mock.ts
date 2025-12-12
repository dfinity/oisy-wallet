import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { ExtToken } from '$icp/types/ext-token';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockExtV2TokenCanisterId,
	mockExtV2TokenCanisterId2
} from '$tests/mocks/ext-v2-token.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidExtV2Token: ExtToken = {
	...mockValidToken,
	id: parseTokenId('ExtV2TokenId'),
	network: ICP_NETWORK,
	standard: 'ext',
	canisterId: mockExtV2TokenCanisterId
};

export const mockValidExtV2Token2: ExtToken = {
	...mockValidToken,
	id: parseTokenId('ExtV2TokenId2'),
	network: ICP_NETWORK,
	standard: 'ext',
	canisterId: mockExtV2TokenCanisterId2
};

export const MOCK_EXT_TOKENS = [mockValidExtV2Token, mockValidExtV2Token2];
