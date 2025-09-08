import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { LINK_TOKEN_GROUP } from '$env/tokens/groups/groups.link.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import link from '$icp-eth/assets/link.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const LINK_DECIMALS = 18;

export const LINK_SYMBOL = 'LINK';

export const LINK_TOKEN_ID: TokenId = parseTokenId(LINK_SYMBOL);

export const LINK_TOKEN: RequiredErc20Token = {
	id: LINK_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: link,
	address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
	exchange: 'erc20',
	twinTokenSymbol: 'ckLINK',
	groupData: LINK_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
	buy: {
		onramperId: 'link_ethereum'
	}
};

export const SEPOLIA_LINK_SYMBOL = 'SepoliaLINK';

export const SEPOLIA_LINK_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_LINK_SYMBOL);

export const SEPOLIA_LINK_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_LINK_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: link,
	address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaLINK'
};
