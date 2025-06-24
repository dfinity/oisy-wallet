import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import arb from '$eth/assets/arb.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ARB_DECIMALS = 18;

const ARB_SYMBOL = 'ARB';

export const ARB_TOKEN_ID: TokenId = parseTokenId(ARB_SYMBOL);

export const ARB_TOKEN: RequiredEvmErc20Token = {
	id: ARB_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ARB',
	symbol: ARB_SYMBOL,
	decimals: ARB_DECIMALS,
	icon: arb,
	address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
	exchange: 'erc20',
	buy: {
		onramperId: 'arb_arbitrum'
	}
};

const ARB_SEPOLIA_ARB_SYMBOL = 'SepoliaARB';

export const ARB_SEPOLIA_ARB_TOKEN_ID: TokenId = parseTokenId(ARB_SEPOLIA_ARB_SYMBOL);

export const ARB_SEPOLIA_ARB_TOKEN: RequiredEvmErc20Token = {
	id: ARB_SEPOLIA_ARB_TOKEN_ID,
	network: ARBITRUM_SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ARB (Sepolia Testnet)',
	symbol: ARB_SEPOLIA_ARB_SYMBOL,
	decimals: ARB_DECIMALS,
	icon: arb,
	address: '0x7Cc1d0980c8D0e248e4F94cf3714F890Dc4F084c',
	exchange: 'erc20'
};
