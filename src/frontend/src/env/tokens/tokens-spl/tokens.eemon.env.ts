import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { EEMON_TOKEN_GROUP } from '$env/tokens/groups/groups.eemon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const EEMON_DECIMALS = 9;

export const EEMON_SYMBOL = 'EEMon';

export const EEMON_TOKEN_ID: TokenId = parseTokenId(EEMON_SYMBOL);

export const EEMON_TOKEN: RequiredSpl2022Token = {
	id: EEMON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'iShares MSCI Emerging Markets ETF (Ondo Tokenized)',
	symbol: EEMON_SYMBOL,
	decimals: EEMON_DECIMALS,
	icon: iSharesPurple,
	address: '916SDKz7y5ZcEZC9CtnQ5Djs1Y8Yv3UAPb6bak8ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: EEMON_TOKEN_GROUP
};
