import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { MUON_TOKEN_GROUP } from '$env/tokens/groups/groups.muon.env';
import muon from '$eth/assets/muon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const MUON_DECIMALS = 18;

const MUON_SYMBOL = 'MUon';

export const MUON_TOKEN_ID: TokenId = parseTokenId(MUON_SYMBOL);

export const MUON_TOKEN: RequiredAdditionalErc20Token = {
	id: MUON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Micron Technology (Ondo Tokenized)',
	symbol: MUON_SYMBOL,
	decimals: MUON_DECIMALS,
	icon: muon,
	address: '0x050362Ab1072Cb2Ce74d74770E22A3203Ad04ee5',
	exchange: 'erc20',
	groupData: MUON_TOKEN_GROUP
};
