import { ARBITRUM_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ARB_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.arb.env';
import { BONK_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.bonk.env';
import {
	ARB_SEPOLIA_USDC_TOKEN,
	USDC_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdt.env';
import { WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.weth.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const ARBITRUM_ERC20_TOKENS_SEPOLIA: RequiredEvmErc20Token[] = [ARB_SEPOLIA_USDC_TOKEN];

const ARBITRUM_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [
	USDC_TOKEN,
	USDT_TOKEN,
	ARB_TOKEN,
	BONK_TOKEN,
	WETH_TOKEN
];

export const ARBITRUM_ERC20_TOKENS: RequiredEvmErc20Token[] = defineSupportedTokens({
	mainnetFlag: ARBITRUM_MAINNET_ENABLED,
	mainnetTokens: ARBITRUM_ERC20_TOKENS_MAINNET,
	testnetTokens: ARBITRUM_ERC20_TOKENS_SEPOLIA
});
