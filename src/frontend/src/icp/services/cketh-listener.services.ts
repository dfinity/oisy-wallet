import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';
import type { SyncCkMinterInfoError, SyncCkMinterInfoSuccess } from '$icp/types/ck';
import { toastsError } from '$lib/stores/toasts.store';
import type { CertifiedData } from '$lib/types/store';
import type { SyncState } from '$lib/types/sync';
import { emit } from '$lib/utils/events.utils';
import type { MinterInfo } from '@dfinity/cketh';
import { jsonReviver } from '@dfinity/utils';

export const syncCkEthMinterInfo = ({ data: postMsgData, tokenId }: SyncCkMinterInfoSuccess) => {
	const { json } = postMsgData;

	const data: CertifiedData<MinterInfo> = JSON.parse(json, jsonReviver);

	ckEthMinterInfoStore.set({
		tokenId,
		data
	});
};

export const syncCkEthMinterError = ({ tokenId, error: err }: SyncCkMinterInfoError) => {
	ckEthMinterInfoStore.reset(tokenId);

	toastsError({
		msg: { text: 'Something went wrong while fetching the ckETH minter information.' },
		err
	});
};

export const syncCkEthMinterStatus = (state: SyncState) =>
	emit({
		message: 'oisyCkEthMinterInfoStatus',
		detail: state
	});
