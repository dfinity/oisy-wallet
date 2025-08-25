import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import pepe from '$icp-eth/assets/pepe.svg';

export const PEPE_DECIMALS = 18;

export const PEPE_SYMBOL = 'PEPE';

export const PEPE_TOKEN_ID: unique symbol = Symbol(PEPE_SYMBOL);

export const PEPE_TOKEN: RequiredErc20Token = {
	id: PEPE_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
	exchange: 'erc20',
	twinTokenSymbol: 'ckPEPE'
};

export const SEPOLIA_PEPE_SYMBOL = 'SepoliaPEPE';

export const SEPOLIA_PEPE_TOKEN_ID: unique symbol = Symbol(SEPOLIA_PEPE_SYMBOL);

export const SEPOLIA_PEPE_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_PEPE_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	address: '0x560eF9F39E4B08f9693987cad307f6FBfd97B2F6',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaPEPE'
};
