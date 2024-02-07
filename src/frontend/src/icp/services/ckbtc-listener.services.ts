import { btcStatusesStore } from '$icp/stores/btc.store';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { toastsError } from '$lib/stores/toasts.store';
import type { PostMessageDataResponseCkBTCWallet } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { jsonReviver } from '@dfinity/utils';

export const syncStatuses = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageDataResponseCkBTCWallet;
	tokenId: TokenId;
}) => {
	const { statuses } = postMsgData;

	const data: CertifiedData<BtcWithdrawalStatuses> = JSON.parse(statuses, jsonReviver);

	btcStatusesStore.set({
		tokenId,
		data
	});
};

export const onLoadStatusesError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
	btcStatusesStore.reset(tokenId);

	toastsError({
		msg: { text: 'Something went wrong while fetching the BTC withdrawal statuses.' },
		err
	});
};
