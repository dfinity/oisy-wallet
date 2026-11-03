import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BABA_DECIMALS = 18;

export const BABA_SYMBOL = 'BABA';

export const BABA_TOKEN_ID: TokenId = parseTokenId(BABA_SYMBOL);

export const BABA_TOKEN: RequiredEvmErc20Token = {
	id: BABA_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Alibaba • Robinhood Token',
	symbol: BABA_SYMBOL,
	decimals: BABA_DECIMALS,
	icon: robinhoodstock,
	address: '0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4'
};
