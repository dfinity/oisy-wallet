import { BONK_SYMBOL } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { DEVNET_EURC_SYMBOL, EURC_SYMBOL } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { JUP_SYMBOL } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ORCA_SYMBOL } from '$env/tokens/tokens-spl/tokens.orca.env';
import { POPCAT_SYMBOL } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { RAY_SYMBOL } from '$env/tokens/tokens-spl/tokens.ray.env';
import { TRUMP_SYMBOL } from '$env/tokens/tokens-spl/tokens.trump.env';
import { DEVNET_USDC_SYMBOL, USDC_SYMBOL } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { USDT_SYMBOL } from '$env/tokens/tokens-spl/tokens.usdt.env';
import { WSOL_SYMBOL } from '$env/tokens/tokens-spl/tokens.wsol.env';
import eurc from '$eth/assets/eurc.svg';
import usdc from '$eth/assets/usdc.svg';
import usdt from '$eth/assets/usdt.svg';
import bonk from '$sol/assets/bonk.svg';
import jup from '$sol/assets/jup.svg';
import orca from '$sol/assets/orca.svg';
import popcat from '$sol/assets/popcat.svg';
import ray from '$sol/assets/ray.svg';
import trump from '$sol/assets/trump.svg';
import wsol from '$sol/assets/wsol.svg';

export const BONK_TOKEN_GROUP = {
	icon: bonk,
	name: 'Bonk',
	symbol: BONK_SYMBOL
};

export const EURC_TOKEN_GROUP = {
	icon: eurc,
	name: 'Euro Coin',
	symbol: EURC_SYMBOL
};

export const EURC_DEVNET_TOKEN_GROUP = {
	icon: eurc,
	name: 'EURC (Devnet)',
	symbol: DEVNET_EURC_SYMBOL
};

export const USDC_DEVNET_TOKEN_GROUP = {
	icon: usdc,
	name: 'USDC (Devnet)',
	symbol: DEVNET_USDC_SYMBOL
};

export const JUP_TOKEN_GROUP = {
	icon: jup,
	name: 'Jupiter',
	symbol: JUP_SYMBOL
};

export const ORCA_TOKEN_GROUP = {
	icon: orca,
	name: 'Orca',
	symbol: ORCA_SYMBOL
};

export const POPCAT_TOKEN_GROUP = {
	icon: popcat,
	name: 'Popcat',
	symbol: POPCAT_SYMBOL
};

export const RAY_TOKEN_GROUP = {
	icon: ray,
	name: 'Raydium',
	symbol: RAY_SYMBOL
};

export const TRUMP_TOKEN_GROUP = {
	icon: trump,
	name: 'OFFICIAL TRUMP',
	symbol: TRUMP_SYMBOL
};

export const USDC_TOKEN_GROUP = {
	icon: usdc,
	name: 'USD Coin',
	symbol: USDC_SYMBOL
};

export const USDT_TOKEN_GROUP = {
	icon: usdt,
	name: 'Tether USD',
	symbol: USDT_SYMBOL
};

export const WSOL_TOKEN_GROUP = {
	icon: wsol,
	name: 'Wrapped SOL',
	symbol: WSOL_SYMBOL
};
