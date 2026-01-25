import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SLVON_TOKEN_GROUP } from '$env/tokens/groups/groups.slvon.env';
import slvon from '$eth/assets/slvon.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const SLVON_DECIMALS = 9;

export const SLVON_SYMBOL = 'SLVon';

export const SLVON_TOKEN_ID: TokenId = parseTokenId(SLVON_SYMBOL);

export const SLVON_TOKEN: RequiredSpl2022Token = {
	id: SLVON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'iShares Silver Trust (Ondo Tokenized Stock)',
	symbol: SLVON_SYMBOL,
	decimals: SLVON_DECIMALS,
	icon: slvon,
	address: 'iy11ytbSGcUnrjE6Lfv78TFqxKyUESfku1FugS9ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: SLVON_TOKEN_GROUP
};
