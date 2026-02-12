import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAUTOPILOT_USDC_DECIMALS = 8;

export const BAUTOPILOT_USDC_SYMBOL = 'bAutopilot_USDC';

export const BAUTOPILOT_USDC_TOKEN_ID: TokenId = parseTokenId(BAUTOPILOT_USDC_SYMBOL);

export const BAUTOPILOT_USDC_TOKEN: RequiredErc4626Token = {
	id: BAUTOPILOT_USDC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	name: 'Autopilot USDC Base',
	symbol: BAUTOPILOT_USDC_SYMBOL,
	decimals: BAUTOPILOT_USDC_DECIMALS,
	icon: usdc,
	address: '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4',
	exchange: 'erc4626',
	assetAddress: USDC_TOKEN.address,
	assetDecimals: USDC_TOKEN.decimals
};
