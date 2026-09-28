import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SMCI_DECIMALS = 18;

export const SMCI_SYMBOL = 'SMCI';

export const SMCI_TOKEN_ID: TokenId = parseTokenId(SMCI_SYMBOL);

export const SMCI_TOKEN: RequiredEvmErc20Token = {
	id: SMCI_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Super Micro Computer • Robinhood Token',
	symbol: SMCI_SYMBOL,
	decimals: SMCI_DECIMALS,
	icon: robinhoodstock,
	address: '0xc01aA1fECeC0605b13bc84874ff7256C0f5F562a'
};
