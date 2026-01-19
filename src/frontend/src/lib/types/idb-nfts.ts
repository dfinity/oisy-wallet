import type { OptionIdentity } from '$lib/types/identity';
import type { Nft } from '$lib/types/nft';

export interface SetIdbNftsParams {
	identity: OptionIdentity;
	nfts: Nft[];
}
