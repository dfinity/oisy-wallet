import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { COPXON_TOKEN_GROUP } from '$env/tokens/groups/groups.copxon.env';
import copxon from '$eth/assets/copxon.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const COPXON_DECIMALS = 9;

export const COPXON_SYMBOL = 'COPXon';

export const COPXON_TOKEN_ID: TokenId = parseTokenId(COPXON_SYMBOL);

export const COPXON_TOKEN: RequiredSpl2022Token = {
	id: COPXON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Global X Copper Miners ETF (Ondo Tokenized)',
	symbol: COPXON_SYMBOL,
	decimals: COPXON_DECIMALS,
	icon: copxon,
	address: 'X7j77hTmjZJbepkXXBcsEapM8qNgdfihkFj6CZ5ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: COPXON_TOKEN_GROUP
};
