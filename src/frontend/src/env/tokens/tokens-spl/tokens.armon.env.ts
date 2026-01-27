import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { ARMON_TOKEN_GROUP } from '$env/tokens/groups/groups.armon.env';
import armon from '$eth/assets/armon.png';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const ARMON_DECIMALS = 9;

export const ARMON_SYMBOL = 'ARMon';

export const ARMON_TOKEN_ID: TokenId = parseTokenId(ARMON_SYMBOL);

export const ARMON_TOKEN: RequiredSpl2022Token = {
	id: ARMON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Arm Holdings plc (Ondo Tokenized)',
	symbol: ARMON_SYMBOL,
	decimals: ARMON_DECIMALS,
	icon: armon,
	address: '15SsCZqCsM9fZGhTmP4rdJTPT9WGZKazDSsgeQ8ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: ARMON_TOKEN_GROUP
};
