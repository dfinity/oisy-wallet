import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { SyncCkMinterInfoError, SyncCkMinterInfoSuccess } from '$icp/types/ck';
import { TRACK_COUNT_CKETH_LOADING_MINTER_INFO_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import type { CertifiedData } from '$lib/types/store';
import type { SyncState } from '$lib/types/sync';
import { emit } from '$lib/utils/events.utils';
import type { MinterInfo } from '@dfinity/cketh';
import { jsonReviver } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncCkEthMinterInfo = ({ data: postMsgData, tokenId }: SyncCkMinterInfoSuccess) => {
	const { json } = postMsgData;

	const data: CertifiedData<MinterInfo> = JSON.parse(json, jsonReviver);

	ckEthMinterInfoStore.set({
		id: tokenId,
		data
	});
};

export const syncCkEthMinterError = ({ tokenId, error: err }: SyncCkMinterInfoError) => {
	ckEthMinterInfoStore.reset(tokenId);

	trackEvent({
		name: TRACK_COUNT_CKETH_LOADING_MINTER_INFO_ERROR,
		metadata: {
			error: `${err}`
		},
		warning: `${get(i18n).init.error.minter_cketh_loading_info}, ${err}`
	});
};

export const syncCkEthMinterStatus = (state: SyncState) =>
	emit({
		message: 'oisyCkEthMinterInfoStatus',
		detail: state
	});
