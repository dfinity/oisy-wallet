import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { IAUON_TOKEN_GROUP } from '$env/tokens/groups/groups.iauon.env';
import ishares from '$eth/assets/ishares.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const IAUON_DECIMALS = 9;

export const IAUON_SYMBOL = 'IAUon';

export const IAUON_TOKEN_ID: TokenId = parseTokenId(IAUON_SYMBOL);

export const IAUON_TOKEN: RequiredSpl2022Token = {
	id: IAUON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'iShares Gold Trust (Ondo Tokenized)',
	symbol: IAUON_SYMBOL,
	decimals: IAUON_DECIMALS,
	icon: ishares,
	address: 'M77ZvkZ8zW5udRbuJCbuwSwavRa7bGAZYMTwru8ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: IAUON_TOKEN_GROUP
};
