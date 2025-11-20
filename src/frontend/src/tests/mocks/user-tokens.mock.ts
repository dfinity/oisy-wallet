import type { UserToken } from '$declarations/backend/backend.did';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { toNullable } from '@dfinity/utils';

export const mockUserTokens: UserToken[] = [
	{
		decimals: toNullable(18),
		version: toNullable(1n),
		enabled: toNullable(true),
		chain_id: ETHEREUM_NETWORK.chainId,
		contract_address: mockEthAddress,
		symbol: toNullable('TTK')
	},
	{
		decimals: toNullable(18),
		version: toNullable(2n),
		enabled: toNullable(),
		chain_id: BASE_NETWORK.chainId,
		contract_address: mockEthAddress2.toUpperCase(),
		symbol: toNullable('TTK2')
	},
	{
		decimals: toNullable(18),
		version: toNullable(),
		enabled: toNullable(false),
		chain_id: POLYGON_AMOY_NETWORK.chainId,
		contract_address: mockEthAddress3,
		symbol: toNullable('TTK3')
	}
];
