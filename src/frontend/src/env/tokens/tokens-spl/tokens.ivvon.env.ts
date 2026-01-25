import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { IVVON_TOKEN_GROUP } from '$env/tokens/groups/groups.ivvon.env';
import isharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const IVVON_DECIMALS = 9;

export const IVVON_SYMBOL = 'IVVon';

export const IVVON_TOKEN_ID: TokenId = parseTokenId(IVVON_SYMBOL);

export const IVVON_TOKEN: RequiredSpl2022Token = {
	id: IVVON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'iShares Core S&P 500 ETF (Ondo Tokenized)',
	symbol: IVVON_SYMBOL,
	decimals: IVVON_DECIMALS,
	icon: isharesPurple,
	address: 'CqW2pd6dCPG9xKZfAsTovzDsMmAGKJSDBNcwM96ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: IVVON_TOKEN_GROUP
};
