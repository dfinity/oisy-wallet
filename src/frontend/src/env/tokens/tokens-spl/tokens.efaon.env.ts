import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { EFAON_TOKEN_GROUP } from '$env/tokens/groups/groups.efaon.env';
import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const EFAON_DECIMALS = 9;

export const EFAON_SYMBOL = 'EFAon';

export const EFAON_TOKEN_ID: TokenId = parseTokenId(EFAON_SYMBOL);

export const EFAON_TOKEN: RequiredSpl2022Token = {
	id: EFAON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'iShares MSCI EAFE ETF',
	symbol: EFAON_SYMBOL,
	decimals: EFAON_DECIMALS,
	icon: iSharesPurple,
	address: 'AbvryMGnaba9oADMZk8Vp2Av6MtczsncGyfWaC4ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: EFAON_TOKEN_GROUP
};
