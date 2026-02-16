import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AUTOPILOT_USDC_DECIMALS = 8;

export const AUTOPILOT_USDC_SYMBOL = 'Autopilot_USDC';

export const AUTOPILOT_USDC_TOKEN_ID: TokenId = parseTokenId(AUTOPILOT_USDC_SYMBOL);

export const AUTOPILOT_USDC_TOKEN: RequiredErc4626Token = {
	id: AUTOPILOT_USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	name: 'Autopilot USDC Ethereum',
	symbol: AUTOPILOT_USDC_SYMBOL,
	decimals: AUTOPILOT_USDC_DECIMALS,
	icon: usdc,
	address: '0x3151cee0cdb517c0e7db2b55ff5085e7d1809d90',
	assetAddress: USDC_TOKEN.address,
	assetDecimals: USDC_TOKEN.decimals
};
