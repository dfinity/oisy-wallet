import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { BABAON_TOKEN_GROUP } from '$env/tokens/groups/groups.babaon.env';
import babaon from '$eth/assets/babaon.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const BABAON_DECIMALS = 9;

export const BABAON_SYMBOL = 'BABAon';

export const BABAON_TOKEN_ID: TokenId = parseTokenId(BABAON_SYMBOL);

export const BABAON_TOKEN: RequiredSpl2022Token = {
	id: BABAON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Alibaba (Ondo Tokenized)',
	symbol: BABAON_SYMBOL,
	decimals: BABAON_DECIMALS,
	icon: babaon,
	address: '1zvb9ELBFShBCWKEk5jRTJAaPAwtVt7quEXx1X4ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: BABAON_TOKEN_GROUP
};
