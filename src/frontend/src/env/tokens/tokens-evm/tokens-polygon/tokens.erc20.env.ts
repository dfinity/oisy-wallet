import { POLYGON_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.polygon.env';
import {
	AMOY_USDC_TOKEN,
	USDC_TOKEN
} from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdt.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const POLYGON_ERC20_TOKENS_AMOY: RequiredEvmErc20Token[] = [AMOY_USDC_TOKEN];

const POLYGON_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [USDC_TOKEN, USDT_TOKEN];

export const POLYGON_ERC20_TOKENS: RequiredEvmErc20Token[] = defineSupportedTokens({
	mainnetFlag: POLYGON_MAINNET_ENABLED,
	mainnetTokens: POLYGON_ERC20_TOKENS_MAINNET,
	testnetTokens: POLYGON_ERC20_TOKENS_AMOY
});
