import { CAIP10_CHAINS_KEYS } from '$env/caip10-chains.env';
import { EIP155_CHAINS_KEYS } from '$env/eip155-chains.env';

export const mapChainIdToNetwork = (chainId: string): 'ethereum' | 'solana' | undefined => {
	const isSolana = CAIP10_CHAINS_KEYS.includes(chainId);
	const isEthereum = EIP155_CHAINS_KEYS.includes(chainId);

	if (isSolana) {
		return 'solana';
	} else if (isEthereum) {
		return 'ethereum';
	}
	return undefined;
};
