import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { MUON_TOKEN_GROUP } from '$env/tokens/groups/groups.muon.env';
import muon from '$eth/assets/muon.png';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const MUON_DECIMALS = 9;

export const MUON_SYMBOL = 'MUon';

export const MUON_TOKEN_ID: TokenId = parseTokenId(MUON_SYMBOL);

export const MUON_TOKEN: RequiredSpl2022Token = {
	id: MUON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Micron Technology (Ondo Tokenized)',
	symbol: MUON_SYMBOL,
	decimals: MUON_DECIMALS,
	icon: muon,
	address: 'Fz9edBpaURPPzpKVRR1A8PENYDEgHqwx5D5th28ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: 'Chm9dcASBc9C54FGxcSRGv9qC998TueQqr5XzGZkEVCc',
	groupData: MUON_TOKEN_GROUP
};
