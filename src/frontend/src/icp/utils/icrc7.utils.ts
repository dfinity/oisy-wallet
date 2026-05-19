import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvIcrc7Token } from '$env/types/env-icrc7-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7Token, Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const isTokenIcrc7 = (token: Partial<IcToken>): token is Icrc7Token =>
	token.standard?.code === 'icrc7';

export const isTokenIcrc7CustomToken = (token: Token): token is Icrc7CustomToken =>
	isTokenIcrc7(token) && isTokenToggleable(token);

export const mapIcrc7Token = ({
	canisterId,
	metadata: { name, symbol }
}: EnvIcrc7Token): Icrc7TokenWithoutId => ({
	canisterId,
	network: ICP_NETWORK,
	name,
	symbol,
	// ICRC-7 tokens are non-fungible; decimals is irrelevant for NFTs and kept at 0
	// to match the convention used by the other NFT standards.
	decimals: 0,
	standard: {
		code: 'icrc7'
	},
	category: 'custom',
	tags: DEFAULT_TOKEN_TAGS
});
