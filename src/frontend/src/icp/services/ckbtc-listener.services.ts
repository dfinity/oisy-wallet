import { btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { waitAndTriggerWallet } from '$icp/utils/ic-wallet.utils';
import { toastsError } from '$lib/stores/toasts.store';
import type { PostMessageJsonDataResponseCkBTC } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { MinterInfo, PendingUtxo } from '@dfinity/ckbtc';
import { jsonReviver } from '@dfinity/utils';

export const syncBtcStatuses = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponseCkBTC;
	tokenId: TokenId;
}) => {
	const { json } = postMsgData;

	const data: CertifiedData<BtcWithdrawalStatuses> = JSON.parse(json, jsonReviver);

	btcStatusesStore.set({
		tokenId,
		data
	});
};

export const syncCkBtcUpdateOk = async ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponseCkBTC;
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
	data: PostMessageJsonDataResponseCkBTC;
	tokenId: TokenId;
}) => {
	const { json } = postMsgData;

	const data: CertifiedData<PendingUtxo[]> = JSON.parse(json, jsonReviver);

	ckBtcPendingUtxosStore.set({
		tokenId,
		data
	});
};

export const syncCkBtcMinterInfo = ({
	data: postMsgData,
	tokenId
}: {
	data: PostMessageJsonDataResponseCkBTC;
	tokenId: TokenId;
}) => {
	const { json } = postMsgData;

	const data: CertifiedData<MinterInfo> = JSON.parse(json, jsonReviver);

	ckBtcMinterInfoStore.set({
		tokenId,
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
		msg: { text: 'Something went wrong while fetching the BTC withdrawal statuses.' },
		err
	});
};

export const onLoadCkBtcMinterInfoError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
	ckBtcMinterInfoStore.reset(tokenId);

	toastsError({
		msg: { text: 'Something went wrong while fetching the ckBTC minter information.' },
		err
	});
};
