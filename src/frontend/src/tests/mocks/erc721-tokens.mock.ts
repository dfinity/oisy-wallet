import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc721Token } from '$eth/types/erc721';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import type { NetworkEnvironment } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';

export const mockValidErc721Token: Erc721Token = {
	...mockValidToken,
	id: parseTokenId('Erc721TokenId'),
	network: ETHEREUM_NETWORK,
	standard: 'erc721',
	address: mockEthAddress
};

export const createMockErc721Tokens = ({
																				n,
																				networkEnv,
																				start = 0
																			}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): Erc721Token[] =>
	Array.from({ length: n }, (_, i) => ({
		id: parseTokenId(`Erc721Token${start + i + 1}-${networkEnv}`),
		symbol: `ERC721-${start + i + 1}-${networkEnv}`,
		name: `Erc721Token${start + i + 1} ${networkEnv}`,
		network: ETHEREUM_NETWORK,
		standard: 'erc721',
		category: 'custom',
		decimals: 0,
		address: `0x${start + i + 1}-${networkEnv}`
	}));

export const createMockErc721CustomTokens = ({
																							n,
																							networkEnv,
																							start = 0
																						}: {
	n: number;
	networkEnv: NetworkEnvironment;
	start?: number;
}): CertifiedData<Erc721CustomToken>[] =>
	createMockErc721Tokens({ n, networkEnv, start }).map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));