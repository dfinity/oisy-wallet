import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';

export const isTokenSpl = (token: Token): token is SplToken => token.standard.code === 'spl';

export const isTokenSplCustomToken = (token: Token): token is SplCustomToken =>
	isTokenSpl(token) && isTokenToggleable(token);

// The same mint address can exist on several clusters, so the network is matched too.
export const findSplToken = ({
	tokens,
	tokenAddress,
	networkId
}: {
	tokens: SplCustomToken[];
	tokenAddress: SplTokenAddress;
	networkId: NetworkId;
}): SplCustomToken | undefined =>
	tokens.find(({ address, network: { id } }) => address === tokenAddress && id === networkId);
