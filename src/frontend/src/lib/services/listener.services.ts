import { btcAddressStore } from '$icp/stores/btc.store';
import type { PostMessageDataResponseBTCAddress } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';

export const syncBtcAddress = ({
	data: { address: data },
	tokenId
}: {
	data: PostMessageDataResponseBTCAddress;
	tokenId: TokenId;
}) => {
	btcAddressStore.set({
		tokenId,
		data
	});
};
