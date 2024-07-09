import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ckErc20Production, ckErc20Staging } from '$env/networks.icrc.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import chainlink from '$icp-eth/assets/chainlink.svg';

export const LINK_DECIMALS = 18;

export const LINK_SYMBOL = 'LINK';

export const LINK_TOKEN_ID: unique symbol = Symbol(LINK_SYMBOL);

export const LINK_TWIN_TOKEN_SYMBOL = 'ckLINK';

export const LINK_TOKEN: RequiredErc20Token = {
	id: LINK_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: chainlink,
	address: ckErc20Production[LINK_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: LINK_TWIN_TOKEN_SYMBOL
};

export const SEPOLIA_LINK_SYMBOL = 'SepoliaLINK';

export const SEPOLIA_LINK_TOKEN_ID: unique symbol = Symbol(SEPOLIA_LINK_SYMBOL);

export const SEPOLIA_LINK_TWIN_TOKEN_SYMBOL = 'ckSepoliaLINK';

export const SEPOLIA_LINK_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_LINK_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: chainlink,
	address: ckErc20Staging[SEPOLIA_LINK_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: SEPOLIA_LINK_TWIN_TOKEN_SYMBOL
};
