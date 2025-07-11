import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredEvmErc721Token } from '$evm/types/erc721';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

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
