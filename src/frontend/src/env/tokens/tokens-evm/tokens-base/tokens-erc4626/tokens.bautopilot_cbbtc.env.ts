import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.cbbtc.env';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAUTOPILOT_CBBTC_DECIMALS = 10;

export const BAUTOPILOT_CBBTC_SYMBOL = 'bAutopilot_cbBTC';

export const BAUTOPILOT_CBBTC_TOKEN_ID: TokenId = parseTokenId(BAUTOPILOT_CBBTC_SYMBOL);

export const BAUTOPILOT_CBBTC_TOKEN: RequiredErc4626Token = {
	id: BAUTOPILOT_CBBTC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	name: 'Autopilot cbBTC Base',
	symbol: BAUTOPILOT_CBBTC_SYMBOL,
	decimals: BAUTOPILOT_CBBTC_DECIMALS,
	address: '0x31a421271414641cb5063b71594b642d2666db6b',
	// TODO: add custom icon
	icon: '',
	assetAddress: CBBTC_TOKEN.address,
	assetDecimals: CBBTC_TOKEN.decimals
};
