import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ARB_TOKEN_GROUP } from '$env/tokens/groups/groups.arb.env';
import arb from '$eth/assets/arb.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ARB_DECIMALS = 18;

const ARB_SYMBOL = 'ARB';

export const ARB_TOKEN_ID: TokenId = parseTokenId(ARB_SYMBOL);

export const ARB_TOKEN: RequiredAdditionalErc20Token = {
	id: ARB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Arbitrum',
	symbol: ARB_SYMBOL,
	decimals: ARB_DECIMALS,
	icon: arb,
	address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
	exchange: 'erc20',
	groupData: ARB_TOKEN_GROUP,
	buy: {
		onramperId: 'arb_ethereum'
	}
};
