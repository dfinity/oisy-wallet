import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	SEPOLIA_USDC_TOKEN as ETH_SEPOLIA_USDC_TOKEN,
	USDC_TOKEN as ETH_USDC_TOKEN
} from '$env/tokens/tokens-erc20/tokens.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredEvmErc20Token } from '$eth/evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: TokenId = parseTokenId(USDC_SYMBOL);

export const USDC_TOKEN: RequiredEvmErc20Token = {
	id: USDC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
	exchange: 'erc20',
	twinToken: ETH_USDC_TOKEN,
	buy: {
		onramperId: 'usdc_base'
	}
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TOKEN: RequiredEvmErc20Token = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: BASE_SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
	exchange: 'erc20',
	twinToken: ETH_SEPOLIA_USDC_TOKEN
};
