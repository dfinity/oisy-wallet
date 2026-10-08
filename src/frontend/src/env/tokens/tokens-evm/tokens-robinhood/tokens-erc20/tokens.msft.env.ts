import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MSFT_DECIMALS = 18;

export const MSFT_SYMBOL = 'MSFT';

export const MSFT_TOKEN_ID: TokenId = parseTokenId(MSFT_SYMBOL);

export const MSFT_TOKEN: RequiredEvmErc20Token = {
	id: MSFT_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Microsoft • Robinhood Token',
	symbol: MSFT_SYMBOL,
	decimals: MSFT_DECIMALS,
	icon: robinhoodstock,
	address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74'
};
