import { ARBITRUM_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { AAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_usdc.env';
import { AAUTOPILOT_WBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_wbtc.env';
import { AAUTOPILOT_WETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_weth.env';
import type { RequiredEvmErc4626Token } from '$evm/types/erc4626';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';

const ARBITRUM_ERC4626_TOKENS_MAINNET: RequiredEvmErc4626Token[] = [
	AAUTOPILOT_USDC_TOKEN,
	AAUTOPILOT_WETH_TOKEN,
	AAUTOPILOT_WBTC_TOKEN
];

export const ARBITRUM_ERC4626_TOKENS: RequiredEvmErc4626Token[] = defineSupportedTokens({
	mainnetFlag: ARBITRUM_MAINNET_ENABLED,
	mainnetTokens: ARBITRUM_ERC4626_TOKENS_MAINNET
});
