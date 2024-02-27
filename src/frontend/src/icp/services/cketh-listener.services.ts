import type { SyncCkMinterInfoError, SyncCkMinterInfoSuccess } from '$icp/types/ck';
import { toastsError } from '$lib/stores/toasts.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';
import { jsonReviver } from '@dfinity/utils';

export const syncCkEthMinterInfo = ({ data: postMsgData, tokenId }: SyncCkMinterInfoSuccess) => {
	const { json } = postMsgData;

	const data: CertifiedData<MinterInfo> = JSON.parse(json, jsonReviver);

	// TODO:
	// ckBtcMinterInfoStore.set({
	//     tokenId,
	//     data
	// });
};

export const syncCkEthMinterError = ({ tokenId, error: err }: SyncCkMinterInfoError) => {
	// TODO:
	// ckBtcMinterInfoStore.reset(tokenId);

	toastsError({
		msg: { text: 'Something went wrong while fetching the ckETH minter information.' },
		err
	});
};
