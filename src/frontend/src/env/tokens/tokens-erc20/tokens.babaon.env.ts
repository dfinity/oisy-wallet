import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BABAON_TOKEN_GROUP } from '$env/tokens/groups/groups.babaon.env';
import babaon from '$eth/assets/babaon.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const BABAON_DECIMALS = 18;

const BABAON_SYMBOL = 'BABAon';

export const BABAON_TOKEN_ID: TokenId = parseTokenId(BABAON_SYMBOL);

export const BABAON_TOKEN: RequiredAdditionalErc20Token = {
	id: BABAON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Alibaba (Ondo Tokenized)',
	symbol: BABAON_SYMBOL,
	decimals: BABAON_DECIMALS,
	icon: babaon,
	address: '0x41765F0FCddC276309195166C7A62AE522FA09ef',
	groupData: BABAON_TOKEN_GROUP
};
