import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import qqqx from '$sol/assets/qqqx.svg';

export const QQQ_DECIMALS = 18;

export const QQQ_SYMBOL = 'QQQ';

export const QQQ_TOKEN_ID: TokenId = parseTokenId(QQQ_SYMBOL);

export const QQQ_TOKEN: RequiredEvmErc20Token = {
	id: QQQ_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Invesco QQQ • Robinhood Token',
	symbol: QQQ_SYMBOL,
	decimals: QQQ_DECIMALS,
	icon: qqqx,
	address: '0xD5f3879160bc7c32ebb4dC785F8a4F505888de68'
};
