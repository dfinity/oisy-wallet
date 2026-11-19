import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export const isTokenEthereumNative = (token: Token): boolean => token.standard?.code === 'ethereum';

/**
 * The native token of an Ethereum network (ETH or SepoliaETH), which pays the fees of a conversion
 * from that network, among the given enabled native tokens.
 */
export const findNativeEthereumToken = <T extends Token>({
	nativeTokens,
	networkId
}: {
	nativeTokens: T[];
	networkId: NetworkId;
}): T | undefined => nativeTokens.find(({ network: { id } }) => id === networkId);
