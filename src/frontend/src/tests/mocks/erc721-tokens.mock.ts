import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import usdc from '$eth/assets/usdc.svg';
import type { Erc721Token } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { RequiredEvmErc721Token } from '$evm/types/erc721';
import type { NetworkEnvironment } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

const AZUKI_ELEMENTAL_BEANS_SYMBOL = 'MBeans';

const AZUKI_ELEMENTAL_BEANS_TOKEN_ID: TokenId = parseTokenId(AZUKI_ELEMENTAL_BEANS_SYMBOL);

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

const DE_GODS_SYMBOL = 'DGods';

const DE_GODS_TOKEN_ID: TokenId = parseTokenId(DE_GODS_SYMBOL);

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

const PUDGY_PENGUINS_SYMBOL = 'Ppenguins';

const PUDGY_PENGUINS_TOKEN_ID: TokenId = parseTokenId(PUDGY_PENGUINS_SYMBOL);

export const PUDGY_PENGUINS_TOKEN: RequiredEvmErc721Token = {
	id: PUDGY_PENGUINS_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc721',
	category: 'custom',
	name: 'Pudgy Penguins',
	symbol: PUDGY_PENGUINS_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8'
};

const SEPOLIA_PUDGY_PENGUINS_SYMBOL = 'Ppenguins';

const SEPOLIA_PUDGY_PENGUINS_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_PUDGY_PENGUINS_SYMBOL);

export const SEPOLIA_PUDGY_PENGUINS_TOKEN: RequiredEvmErc721Token = {
	id: SEPOLIA_PUDGY_PENGUINS_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc721',
	category: 'custom',
	name: 'Pudgy Penguins',
	symbol: SEPOLIA_PUDGY_PENGUINS_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8'
};

export const MOCK_ERC721_TOKENS = [
	AZUKI_ELEMENTAL_BEANS_TOKEN,
	DE_GODS_TOKEN,
	PUDGY_PENGUINS_TOKEN
];

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
