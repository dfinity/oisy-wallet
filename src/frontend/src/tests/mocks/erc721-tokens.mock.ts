import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredEvmErc721Token } from '$evm/types/erc721';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import type { NetworkEnvironment } from '$lib/types/network';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Erc721Token } from '$eth/types/erc721';
import type { CertifiedData } from '$lib/types/store';

export const AZUKI_ELEMENTAL_BEANS_SYMBOL = 'MBeans';

export const AZUKI_ELEMENTAL_BEANS_TOKEN_ID: TokenId = parseTokenId(AZUKI_ELEMENTAL_BEANS_SYMBOL);

export const AZUKI_ELEMENTAL_BEANS_TOKEN: RequiredEvmErc721Token = {
	id: AZUKI_ELEMENTAL_BEANS_TOKEN_ID,
	network: POLYGON_AMOY_NETWORK,
	standard: 'erc721',
	category: 'custom',
	name: 'Mbean',
	symbol: AZUKI_ELEMENTAL_BEANS_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
};

export const DE_GODS_SYMBOL = 'DGods';

export const DE_GODS_TOKEN_ID: TokenId = parseTokenId(DE_GODS_SYMBOL);

export const DE_GODS_TOKEN: RequiredEvmErc721Token = {
	id: DE_GODS_TOKEN_ID,
	network: POLYGON_AMOY_NETWORK,
	standard: 'erc721',
	category: 'custom',
	name: 'DeGods',
	symbol: DE_GODS_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0x41E54Eb019C0762f9Bfcf9Fb1E58925BfB0e7582'
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