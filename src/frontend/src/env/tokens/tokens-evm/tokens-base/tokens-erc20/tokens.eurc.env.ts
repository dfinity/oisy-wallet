import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import { EURC_TOKEN_GROUP } from '$env/tokens/groups/groups.eurc.env';
import eurc from '$eth/assets/eurc.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const EURC_DECIMALS = 6;

export const EURC_SYMBOL = 'EURC';

export const EURC_TOKEN_ID: TokenId = parseTokenId(EURC_SYMBOL);

export const EURC_TOKEN: RequiredEvmErc20Token = {
	id: EURC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Euro Coin',
	symbol: EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: eurc,
	address: '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
	exchange: 'erc20',
	groupData: EURC_TOKEN_GROUP
};

export const SEPOLIA_EURC_SYMBOL = 'SepoliaEURC';

export const SEPOLIA_EURC_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_EURC_SYMBOL);

export const SEPOLIA_EURC_TOKEN: RequiredEvmErc20Token = {
	id: SEPOLIA_EURC_TOKEN_ID,
	network: BASE_SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'EURC',
	symbol: EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: eurc,
	address: '0x808456652fdb597867f38412077A9182bf77359F',
	exchange: 'erc20'
};
