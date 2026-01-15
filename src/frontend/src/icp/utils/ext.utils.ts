import type { TokenIdentifier, TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { EnvExtToken, EnvExtTokenStandardVersion } from '$env/types/env-ext-token';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import type { ExtToken, ExtTokenWithoutId } from '$icp/types/ext-token';
import type { IcToken } from '$icp/types/ic-token';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token.utils';
import { Principal } from '@icp-sdk/core/principal';

export const isTokenExt = (token: Partial<IcToken>): token is ExtToken =>
	token.standard?.code === 'ext';

export const isTokenExtCustomToken = (token: Token): token is ExtCustomToken =>
	isTokenExt(token) && isTokenToggleable(token);

// The minting number (that wallets, frontends, etc. usually show) is 1-based indexed, it's simply (TokenIndex + 1).
export const parseExtTokenIndex = (index: TokenIndex): TokenIndex => index + 1;

/**
 * Converts a token index to a token identifier.
 *
 * TokenIdentifier is essentially TokenIndex encoded with collection canister principal.
 * This way every NFT has their own unique identifier.
 *
 * @link https://github.com/Toniq-Labs/ext-v2-token/blob/a55d7c4ea14b50fac92fa170a9261a5d8c85d0f2/src/extjs/extjs.js#L20
 *
 * @param params - The parameters for the conversion.
 * @param {Principal} params.collectionId - The collection canister principal.
 * @param {TokenIndex} params.index - The token index.
 * @returns {TokenIdentifier} The token identifier.
 * @throws Error if the index is negative.
 */
export const extIndexToIdentifier = ({
	collectionId,
	index
}: {
	collectionId: Principal;
	index: TokenIndex;
}): TokenIdentifier => {
	if (index < 0) {
		throw new Error(`EXT token index ${index} is out of bounds`);
	}

	const to32bits = (num: number): number[] => [
		(num >>> 24) & 0xff,
		(num >>> 16) & 0xff,
		(num >>> 8) & 0xff,
		num & 0xff
	];

	const padding = new Uint8Array([0x0a, ...'tid'.split('').map((c) => c.charCodeAt(0))]);

	const array = new Uint8Array([...padding, ...collectionId.toUint8Array(), ...to32bits(index)]);

	return Principal.fromUint8Array(array).toText();
};

const mapStandardVersion = (version: EnvExtTokenStandardVersion): string | undefined =>
	version === 'ext'
		? 'v2'
		: version === 'legacy1.5'
			? 'v1.5'
			: version === 'legacy'
				? 'v1'
				: undefined;

export const mapExtToken = ({
	canisterId,
	standardVersion,
	metadata: { name, symbol }
}: EnvExtToken): ExtTokenWithoutId => ({
	canisterId,
	network: ICP_NETWORK,
	name,
	symbol,
	// For our current scopes, there is no need to have the correct decimals, since we are using this standard as NFT collections.
	decimals: 0,
	standard: {
		code: 'ext',
		version: mapStandardVersion(standardVersion)
	},
	category: 'custom'
});
