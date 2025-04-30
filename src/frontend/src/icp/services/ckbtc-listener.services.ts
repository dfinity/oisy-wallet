import { btcAddressStore, btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import type { SyncCkMinterInfoError, SyncCkMinterInfoSuccess } from '$icp/types/ck';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessageDataResponseBTCAddress,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { SyncState } from '$lib/types/sync';
import type { TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { MinterInfo, PendingUtxo } from '@dfinity/ckbtc';
import { jsonReviver } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncBtcStatuses = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponse;
	tokenId: TokenId;
}) => {
	const { json } = postMsgData;

	const data: CertifiedData<BtcWithdrawalStatuses> = JSON.parse(json, jsonReviver);

	btcStatusesStore.set({
		id: tokenId,
		data
	});
};

export const syncCkBTCUpdateOk = async ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponse;
	tokenId: TokenId;
}) => {
	// First update the new IC transactions
	await waitAndTriggerWallet();

	// Then remove the pending transactions
	const { json } = postMsgData;

	const utxosIds: CertifiedData<UtxoTxidText[]> = JSON.parse(json, jsonReviver);

	ckBtcPendingUtxosStore.filter({
		tokenId,
		utxosIds
	});
};

export const syncBtcPendingUtxos = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponse;
	tokenId: TokenId;
}) => {
	const { json } = postMsgData;

	const data: CertifiedData<PendingUtxo[]> = JSON.parse(json, jsonReviver);

	ckBtcPendingUtxosStore.set({
		id: tokenId,
		data
	});
};

export const syncBtcAddress = ({
	data: { address: data },
	tokenId
}: {
	data: PostMessageDataResponseBTCAddress;
	tokenId: TokenId;
}) => {
	btcAddressStore.set({
		id: tokenId,
		data
	});
};

export const syncCkBtcMinterInfo = ({ data: postMsgData, tokenId }: SyncCkMinterInfoSuccess) => {
	const { json } = postMsgData;

	const data: CertifiedData<MinterInfo> = JSON.parse(json, jsonReviver);

	ckBtcMinterInfoStore.set({
		id: tokenId,
		data
	});
};

export const onLoadBtcStatusesError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
	btcStatusesStore.reset(tokenId);

	toastsError({
		msg: { text: get(i18n).init.error.btc_withdrawal_statuses },
		err
	});
};

export const syncCkBtcMinterError = ({ tokenId, error: err }: SyncCkMinterInfoError) => {
	ckBtcMinterInfoStore.reset(tokenId);

	toastsError({
		msg: { text: get(i18n).init.error.minter_ckbtc_info },
		err
	});
};

export const syncCkBtcMinterStatus = (state: SyncState) =>
	emit({
		message: 'oisyCkBtcMinterInfoStatus',
		detail: state
	});
