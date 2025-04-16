import { EURC_SYMBOL } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { LINK_SYMBOL } from '$env/tokens/tokens-erc20/tokens.link.env';
import { OCT_SYMBOL } from '$env/tokens/tokens-erc20/tokens.oct.env';
import { PEPE_SYMBOL } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SHIB_SYMBOL } from '$env/tokens/tokens-erc20/tokens.shib.env';
import { UNI_SYMBOL } from '$env/tokens/tokens-erc20/tokens.uni.env';
import { WBTC_SYMBOL } from '$env/tokens/tokens-erc20/tokens.wbtc.env';
import { WSTETH_SYMBOL } from '$env/tokens/tokens-erc20/tokens.wsteth.env';
import { XAUT_SYMBOL } from '$env/tokens/tokens-erc20/tokens.xaut.env';
import eurc from '$eth/assets/eurc.svg';
import xaut from '$eth/assets/xaut.svg';
import link from '$icp-eth/assets/link.svg';
import oct from '$icp-eth/assets/oct.svg';
import pepe from '$icp-eth/assets/pepe.svg';
import shib from '$icp-eth/assets/shib.svg';
import uni from '$icp-eth/assets/uni.svg';
import wbtc from '$icp-eth/assets/wbtc.svg';
import wsteth from '$icp-eth/assets/wsteth.svg';

export const SEPOLIA_EURC_TOKEN_GROUP = {
	icon: eurc,
	name: 'EURC',
	symbol: EURC_SYMBOL
};

export const LINK_TOKEN_GROUP = {
	icon: link,
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL
};

export const OCT_TOKEN_GROUP = {
	icon: oct,
	name: 'Octopus Network Token',
	symbol: OCT_SYMBOL
};

export const PEPE_TOKEN_GROUP = {
	icon: pepe,
	name: 'Pepe',
	symbol: PEPE_SYMBOL
};

export const SHIB_TOKEN_GROUP = {
	icon: shib,
	name: 'SHIBA INU',
	symbol: SHIB_SYMBOL
};

export const UNI_TOKEN_GROUP = {
	icon: uni,
	name: 'Uniswap',
	symbol: UNI_SYMBOL
};

export const WBTC_TOKEN_GROUP = {
	icon: wbtc,
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL
};

export const WSETH_TOKEN_GROUP = {
	icon: wsteth,
	name: 'Wrapped liquid staked Ether 2.0',
	symbol: WSTETH_SYMBOL
};

export const XAUT_TOKEN_GROUP = {
	icon: xaut,
	name: 'Tether Gold',
	symbol: XAUT_SYMBOL
};
