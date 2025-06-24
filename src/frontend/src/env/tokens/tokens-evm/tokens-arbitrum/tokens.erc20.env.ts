import { ARBITRUM_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	ARB_SEPOLIA_USDC_TOKEN,
	USDC_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import {
	ARB_SEPOLIA_USDT_TOKEN,
	USDT_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdt.env';
import {
	ARB_SEPOLIA_ARB_TOKEN,
	ARB_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.arb.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const ARBITRUM_ERC20_TOKENS_SEPOLIA: RequiredEvmErc20Token[] = [
	ARB_SEPOLIA_USDC_TOKEN,
	ARB_SEPOLIA_USDT_TOKEN,
	ARB_SEPOLIA_ARB_TOKEN
];

const ARBITRUM_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [USDC_TOKEN, USDT_TOKEN, ARB_TOKEN];

export const ARBITRUM_ERC20_TOKENS: RequiredEvmErc20Token[] = defineSupportedTokens({
	mainnetFlag: ARBITRUM_MAINNET_ENABLED,
	mainnetTokens: ARBITRUM_ERC20_TOKENS_MAINNET,
	testnetTokens: ARBITRUM_ERC20_TOKENS_SEPOLIA
});
