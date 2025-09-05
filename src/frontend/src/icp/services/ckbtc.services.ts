import {
	estimateFee,
	getBtcAddress,
	updateBalance as updateBalanceApi
} from '$icp/api/ckbtc-minter.api';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkMetadata, IcCkToken, IcToken } from '$icp/types/ic-token';
import { TRACK_COUNT_CKBTC_LOADING_MINTER_INFO_ERROR } from '$lib/constants/analytics.contants';
import { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
import { waitWalletReady } from '$lib/services/actions.services';
import { trackEvent } from '$lib/services/analytics.services';
import { busy } from '$lib/stores/busy.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import {
	MinterNoNewUtxosError,
	type EstimateWithdrawalFee,
	type PendingUtxo
} from '@dfinity/ckbtc';
import {
	assertNonNullish,
	isNullish,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateRequestParams
} from '@dfinity/utils';
import { get } from 'svelte/store';

export const updateBalance = async ({
	token: { minterCanisterId, id: tokenId },
	progress,
	identity
}: CkBtcUpdateBalanceParams & {
	token: IcCkToken;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_btc);

	progress(ProgressStepsUpdateBalanceCkBtc.RETRIEVE);

	try {
		const ok = await updateBalanceApi({
			identity,
			minterCanisterId
		});

		populatePendingUtxos({ tokenId, pendingUtxos: [] });

		if (ok.length === 0) {
			toastsShow({
				text: get(i18n).receive.bitcoin.info.no_new_btc,
				level: 'info',
				duration: 3000
			});
			return;
		}
	} catch (err: unknown) {
		if (!(err instanceof MinterNoNewUtxosError)) {
			throw err;
		}

		const { pendingUtxos } = err;

		populatePendingUtxos({ tokenId, pendingUtxos });
	}

	progress(ProgressStepsUpdateBalanceCkBtc.RELOAD);

	await waitAndTriggerWallet();
};

const populatePendingUtxos = ({
	pendingUtxos,
	tokenId
}: {
	pendingUtxos: PendingUtxo[];
	tokenId: TokenId;
}) => {
	const data: CertifiedData<PendingUtxo[]> = {
		certified: true,
		data: pendingUtxos
	};

	ckBtcPendingUtxosStore.set({
		id: tokenId,
		data
	});
};

export const loadAllCkBtcInfo = async ({
	id: tokenId,
	minterCanisterId,
	...rest
}: IcCkToken & { identity: OptionIdentity }) => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckbtc_info);

	const addressStore = get(btcAddressStore);
	const minterInfoStore = get(ckBtcMinterInfoStore);

	const addressLoaded = nonNullish(addressStore?.[tokenId]);
	const infoLoaded = nonNullish(minterInfoStore?.[tokenId]);

	// We try to load only once per session the information for performance reason
	if (addressLoaded && infoLoaded) {
		return;
	}

	busy.start({ msg: get(i18n).init.info.hold_loading });

	const params = {
		id: tokenId,
		minterCanisterId,
		...rest
	};

	// ckBTC minter info are loaded when accessing the ckBTC transactions page with a worker
	const waitCkBtcMinterInfoLoaded = (): Promise<void> =>
		new Promise<void>((resolve, reject) => {
			const isDisabled = (): boolean => {
				const $ckBtcMinterInfoStore = get(ckBtcMinterInfoStore);
				return isNullish($ckBtcMinterInfoStore?.[tokenId]);
			};

			waitWalletReady(isDisabled).then((status) => (status === 'timeout' ? reject() : resolve()));
		});

	await Promise.all([
		addressLoaded ? Promise.resolve() : loadBtcAddress(params),
		infoLoaded ? Promise.resolve() : waitCkBtcMinterInfoLoaded()
	]);

	busy.stop();
};

const loadBtcAddress = (params: IcCkToken & { identity: OptionIdentity }): Promise<void> =>
	loadData({
		...params,
		store: btcAddressStore,
		request: (params) => getBtcAddress(params)
	});

type LoadData = <T>(params: LoadDataParams<T>) => Promise<void>;

type LoadDataParams<T> = IcToken &
	Partial<IcCkMetadata> & {
		store: CertifiedSetterStoreStore<CertifiedData<T>>;
		request: (
			options: QueryAndUpdateRequestParams & Pick<IcCkMetadata, 'minterCanisterId'>
		) => Promise<T>;
		identity: OptionIdentity;
	};

const loadData: LoadData = async <T>({
	id,
	minterCanisterId,
	store,
	request,
	identity
}: LoadDataParams<T>) => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckbtc_info);

	await queryAndUpdate<T>({
		request: ({ identity, certified }) =>
			request({
				minterCanisterId,
				identity,
				certified
			}),
		onLoad: ({ response: data, certified }) => store.set({ id, data: { data, certified } }),
		onUpdateError: ({ error: err }) => {
			store.reset(id);

			trackEvent({
				name: TRACK_COUNT_CKBTC_LOADING_MINTER_INFO_ERROR,
				metadata: {
					error: `${err}`
				},
				warning: `${get(i18n).init.error.minter_ckbtc_loading_info}, ${err}`
			});
		},
		identity
	});
};

export const queryEstimateFee = async ({
	identity,
	minterCanisterId,
	amount
}: Partial<IcCkMetadata> & {
	identity: OptionIdentity;
	amount: bigint;
}): Promise<{
	result: 'success' | 'error';
	fee?: EstimateWithdrawalFee;
}> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckbtc_info);

	try {
		const fee = await estimateFee({
			identity,
			amount,
			minterCanisterId,
			certified: false
		});

		return { result: 'success', fee };
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).init.error.btc_fees_estimation },
			err
		});

		return { result: 'error' };
	}
};
