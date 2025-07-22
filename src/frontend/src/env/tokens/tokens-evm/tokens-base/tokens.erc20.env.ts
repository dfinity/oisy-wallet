import { BASE_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.base.env';
import {
	EURC_TOKEN,
	SEPOLIA_EURC_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.eurc.env';
import { SPX_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.spx.env';
import {
	SEPOLIA_USDC_TOKEN,
	USDC_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const BASE_ERC20_TOKENS_SEPOLIA: RequiredEvmErc20Token[] = [SEPOLIA_USDC_TOKEN, SEPOLIA_EURC_TOKEN];

const BASE_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [EURC_TOKEN, SPX_TOKEN, USDC_TOKEN];

export const BASE_ERC20_TOKENS: RequiredEvmErc20Token[] = defineSupportedTokens({
	mainnetFlag: BASE_MAINNET_ENABLED,
	mainnetTokens: BASE_ERC20_TOKENS_MAINNET,
	testnetTokens: BASE_ERC20_TOKENS_SEPOLIA
});
