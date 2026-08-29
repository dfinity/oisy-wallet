import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';

export const isTokenSpl = (token: Token): token is SplToken => token.standard.code === 'spl';

export const isTokenSplCustomToken = (token: Token): token is SplCustomToken =>
	isTokenSpl(token) && isTokenToggleable(token);

/**
 * The enabled SPL token of a mint on a network, or nothing when the wallet does not list it.
 *
 * The same mint can exist on several clusters, which is why the network is part of the key. One
 * lookup for every surface that names a token, so an unlisted mint fails the same way everywhere.
 */
export const findEnabledSplToken = ({
	tokens,
	tokenAddress,
	networkId
}: {
	tokens: SplCustomToken[];
	tokenAddress: string | undefined;
	networkId: NetworkId;
}): SplCustomToken | undefined =>
	tokens.find(({ address, network: { id } }) => address === tokenAddress && id === networkId);
