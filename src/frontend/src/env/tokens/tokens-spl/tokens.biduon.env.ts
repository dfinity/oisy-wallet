import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { BIDUON_TOKEN_GROUP } from '$env/tokens/groups/groups.biduon.env';
import biduon from '$eth/assets/biduon.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const BIDUON_DECIMALS = 9;

export const BIDUON_SYMBOL = 'BIDUon';

export const BIDUON_TOKEN_ID: TokenId = parseTokenId(BIDUON_SYMBOL);

export const BIDUON_TOKEN: RequiredSpl2022Token = {
	id: BIDUON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Baidu (Ondo Tokenized)',
	symbol: BIDUON_SYMBOL,
	decimals: BIDUON_DECIMALS,
	icon: biduon,
	address: '54CoRF2FYMZNJg9tS36xq5BUcLZ7rju1r59jGc2ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: BIDUON_TOKEN_GROUP
};
