import { ROBINHOOD_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.cbbtc.env';
import { USDE_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usde.env';
import { USDG_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usdg.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const ROBINHOOD_ERC20_TOKENS_MAINNET: RequiredEvmErc20Token[] = [
	USDG_TOKEN,
	USDE_TOKEN,
	CBBTC_TOKEN
];

export const ROBINHOOD_ERC20_TOKENS: RequiredEvmErc20Token[] = defineSupportedTokens({
	mainnetFlag: ROBINHOOD_MAINNET_ENABLED,
	mainnetTokens: ROBINHOOD_ERC20_TOKENS_MAINNET
});
