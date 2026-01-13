import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvIcPunksToken } from '$env/types/env-icpunks-token';
import type { IcToken } from '$icp/types/ic-token';
import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
import type { IcPunksToken, IcPunksTokenWithoutId } from '$icp/types/icpunks-token';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token.utils';

export const isTokenIcPunks = (token: Partial<IcToken>): token is IcPunksToken =>
	token.standard?.code === 'icpunks';

export const isTokenIcPunksCustomToken = (token: Token): token is IcPunksCustomToken =>
	isTokenIcPunks(token) && isTokenToggleable(token);

export const mapIcPunksToken = ({
	canisterId,
	metadata: { name }
}: EnvIcPunksToken): IcPunksTokenWithoutId => ({
	canisterId,
	network: ICP_NETWORK,
	name,
	// Currently, we have no way to get a correct symbol metadata from the canister, so we use the name as a fallback.
	symbol: name,
	// For our current scopes, there is no need to have the correct decimals, since we are using this standard as NFT collections.
	decimals: 0,
	standard: {
		code: 'icpunks'
	},
	category: 'custom'
});
