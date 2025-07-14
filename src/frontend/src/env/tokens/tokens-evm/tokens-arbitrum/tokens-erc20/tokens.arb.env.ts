import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ARB_TOKEN_GROUP } from '$env/tokens/groups/groups.arb.env';
import arb from '$eth/assets/arb.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ARB_DECIMALS = 18;

const ARB_SYMBOL = 'ARB';

export const ARB_TOKEN_ID: TokenId = parseTokenId(ARB_SYMBOL);

export const ARB_TOKEN: RequiredEvmErc20Token = {
	id: ARB_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Arbitrum',
	symbol: ARB_SYMBOL,
	decimals: ARB_DECIMALS,
	icon: arb,
	address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
	exchange: 'erc20',
	groupData: ARB_TOKEN_GROUP,
	buy: {
		onramperId: 'arb_arbitrum'
	}
};
