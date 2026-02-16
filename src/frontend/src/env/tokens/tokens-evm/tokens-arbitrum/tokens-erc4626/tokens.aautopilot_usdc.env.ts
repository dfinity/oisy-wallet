import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AAUTOPILOT_USDC_DECIMALS = 8;

export const AAUTOPILOT_USDC_SYMBOL = 'aAutopilot_USDC';

export const AAUTOPILOT_USDC_TOKEN_ID: TokenId = parseTokenId(AAUTOPILOT_USDC_SYMBOL);

export const AAUTOPILOT_USDC_TOKEN: RequiredErc4626Token = {
	id: AAUTOPILOT_USDC_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	name: 'Autopilot USDC Arbitrum',
	symbol: AAUTOPILOT_USDC_SYMBOL,
	decimals: AAUTOPILOT_USDC_DECIMALS,
	icon: usdc,
	address: '0x407d3d942d0911a2fea7e22417f81e27c02d6c6f',
	assetAddress: USDC_TOKEN.address,
	assetDecimals: USDC_TOKEN.decimals
};
