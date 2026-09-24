import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';

export const isTokenSpl = (token: Token): token is SplToken => token.standard.code === 'spl';

export const isTokenSplCustomToken = (token: Token): token is SplCustomToken =>
	isTokenSpl(token) && isTokenToggleable(token);

/**
 * The SPL token of a mint on a network, or nothing when the wallet does not list it.
 *
 * The same mint can exist on several clusters, which is why the network is part of the key. One
 * lookup for every surface that names a token, so an unlisted mint fails the same way everywhere.
 *
 * Enablement is not part of the question: it says which tokens the user wants to hold, not which
 * ones the wallet knows how to read. Callers pass the full list, so a disabled token is still
 * named and still carries its decimals.
 */
export const findSplToken = ({
	tokens,
	tokenAddress,
	networkId
}: {
	tokens: SplCustomToken[];
	tokenAddress: string | undefined;
	networkId: NetworkId;
}): SplCustomToken | undefined =>
	tokens.find(({ address, network: { id } }) => address === tokenAddress && id === networkId);
