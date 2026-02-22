import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { PBRON_TOKEN_GROUP } from '$env/tokens/groups/groups.pbron.env';
import pbron from '$eth/assets/pbron.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const PBRON_DECIMALS = 9;

export const PBRON_SYMBOL = 'PBRon';

export const PBRON_TOKEN_ID: TokenId = parseTokenId(PBRON_SYMBOL);

export const PBRON_TOKEN: RequiredSpl2022Token = {
	id: PBRON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Petrobras (Ondo Tokenized)',
	symbol: PBRON_SYMBOL,
	decimals: PBRON_DECIMALS,
	icon: pbron,
	address: 'GRciFCqJ5y2hbiD6U5mGkohY65BZTXGuGUrCqf7ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: PBRON_TOKEN_GROUP
};
