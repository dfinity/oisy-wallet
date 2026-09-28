import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import muon from '$eth/assets/muon.png';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MU_DECIMALS = 18;

export const MU_SYMBOL = 'MU';

export const MU_TOKEN_ID: TokenId = parseTokenId(MU_SYMBOL);

export const MU_TOKEN: RequiredEvmErc20Token = {
	id: MU_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Micron Technology • Robinhood Token',
	symbol: MU_SYMBOL,
	decimals: MU_DECIMALS,
	icon: muon,
	address: '0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD'
};
