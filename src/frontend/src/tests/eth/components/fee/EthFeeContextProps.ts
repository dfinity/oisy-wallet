import type { EthereumNetwork } from '$eth/types/network';
import type { Network } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import type { OptionAmount } from '$lib/types/send';
import type { Token, TokenId } from '$lib/types/token';

export interface EthFeeContextProps {
	observe: boolean;
	destination: string;
	amount: OptionAmount;
	data: string | undefined;
	sourceNetwork: EthereumNetwork;
	targetNetwork: Network | undefined;
	nativeEthereumToken: Token;
	sendToken: Token;
	sendTokenId: TokenId;
	sendNft: Nft | undefined;
}
