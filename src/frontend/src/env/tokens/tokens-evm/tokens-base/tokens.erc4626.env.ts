import { BASE_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.base.env';
import { BAUTOPILOT_CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_cbbtc.env';
import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import { BAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_weth.env';
import { MORPHOAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.morphoautopilot_usdc.env';
import type { RequiredEvmErc4626Token } from '$evm/types/erc4626';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const BASE_ERC4626_TOKENS_MAINNET: RequiredEvmErc4626Token[] = [
	BAUTOPILOT_USDC_TOKEN,
	MORPHOAUTOPILOT_USDC_TOKEN,
	BAUTOPILOT_WETH_TOKEN,
	BAUTOPILOT_CBBTC_TOKEN
];

export const BASE_ERC4626_TOKENS: RequiredEvmErc4626Token[] = defineSupportedTokens({
	mainnetFlag: BASE_MAINNET_ENABLED,
	mainnetTokens: BASE_ERC4626_TOKENS_MAINNET
});
