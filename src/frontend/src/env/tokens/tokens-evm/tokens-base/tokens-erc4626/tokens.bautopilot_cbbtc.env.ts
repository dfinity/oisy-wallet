import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
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
	// TODO: add cbBTC (ERC20) token to the list and use its data below
	assetAddress: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
	assetDecimals: 8
};
