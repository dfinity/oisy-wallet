import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { EURC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.eurc.env';
import autopiloteurc from '$eth/assets/autopiloteurc.webp';
import type { RequiredErc4626Token } from '$eth/types/erc4626';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAUTOPILOT_EURC_DECIMALS = 8;

export const BAUTOPILOT_EURC_SYMBOL = 'bAutopilot_EURC';

export const BAUTOPILOT_EURC_TOKEN_ID: TokenId = parseTokenId(BAUTOPILOT_EURC_SYMBOL);

export const BAUTOPILOT_EURC_TOKEN: RequiredErc4626Token = {
	id: BAUTOPILOT_EURC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc4626' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'Autopilot EURC Base',
	symbol: BAUTOPILOT_EURC_SYMBOL,
	decimals: BAUTOPILOT_EURC_DECIMALS,
	icon: autopiloteurc,
	address: '0x180493090667A35D8511Be743835dAD8715d33be',
	assetAddress: EURC_TOKEN.address,
	assetDecimals: EURC_TOKEN.decimals,
	assetIcon: EURC_TOKEN.icon,
	assetSymbol: EURC_TOKEN.symbol
};
