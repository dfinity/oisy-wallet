import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EnvExtTokensSchema } from '$env/schema/env-ext-token.schema';
import extTokens from '$env/tokens/tokens-ext/tokens.ext.json';
import type { EnvExtToken } from '$env/types/env-ext-token';
import type { ExtTokenWithoutId } from '$icp/types/ext-token';

const mapExtToken = ({ canisterId, metadata: { name } }: EnvExtToken): ExtTokenWithoutId => ({
	canisterId,
	network: ICP_NETWORK,
	name,
	// Currently, we have no way to get a correct symbol metadata from the canister, so we use the name as a fallback.
	symbol: name,
	// For our current scopes, there is no need to have the correct decimals, since we are using this standard as NFT collections.
	decimals: 0,
	standard: 'extV2',
	category: 'custom'
});

// Just to be safe, we want to raise an error on build time if the tokens.ext.json file is not valid.
export const EXT_BUILTIN_TOKENS = EnvExtTokensSchema.parse(extTokens).map(mapExtToken);

export const EXT_BUILTIN_TOKENS_INDEXED = new Map(
	EXT_BUILTIN_TOKENS.map((token) => [token.canisterId, token])
);
