import { btcStatusesStore } from '$icp/stores/btc.store';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessageDataResponseBtcPendingUtxos,
	PostMessageDataResponseBtcStatuses
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { PendingUtxo } from '@dfinity/ckbtc';
import { jsonReviver } from '@dfinity/utils';

export const syncStatuses = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageDataResponseBtcStatuses;
	tokenId: TokenId;
}) => {
	const { statuses } = postMsgData;

	const data: CertifiedData<BtcWithdrawalStatuses> = JSON.parse(statuses, jsonReviver);

	btcStatusesStore.set({
		tokenId,
		data
	});
};

export const syncPendingUtxos = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageDataResponseBtcPendingUtxos;
	tokenId: TokenId;
}) => {
	const { pendingUtxos } = postMsgData;

	const data: CertifiedData<PendingUtxo> = JSON.parse(pendingUtxos, jsonReviver);

	// TODO: data
	console.log(data, tokenId);
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
