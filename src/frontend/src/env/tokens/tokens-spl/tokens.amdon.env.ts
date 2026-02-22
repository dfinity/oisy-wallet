import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { AMDON_TOKEN_GROUP } from '$env/tokens/groups/groups.amdon.env';
import amdon from '$eth/assets/amdon.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const AMDON_DECIMALS = 9;

export const AMDON_SYMBOL = 'AMDon';

export const AMDON_TOKEN_ID: TokenId = parseTokenId(AMDON_SYMBOL);

export const AMDON_TOKEN: RequiredSpl2022Token = {
	id: AMDON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'AMD (Ondo Tokenized Stock)',
	symbol: AMDON_SYMBOL,
	decimals: AMDON_DECIMALS,
	icon: amdon,
	address: '14diAn5z8kjrKwSC8WLqvBqqe5YmihJhjxRxd8Z6ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: AMDON_TOKEN_GROUP
};
