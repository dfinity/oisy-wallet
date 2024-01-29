import {
	estimateFee,
	getBtcAddress,
	minterInfo,
	updateBalance as updateBalanceApi
} from '$icp/api/ckbtc-minter.api';
import { CKBTC_TRANSACTIONS_RELOAD_DELAY } from '$icp/constants/ckbtc.constants';
import { btcAddressStore, ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { busy } from '$lib/stores/busy.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { CertifiedData } from '$lib/types/store';
import { emit } from '$lib/utils/events.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { AnonymousIdentity } from '@dfinity/agent';
import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const updateBalance = async ({
	token: { minterCanisterId },
	progress,
	identity
}: CkBtcUpdateBalanceParams & {
	token: IcToken & Partial<IcCkCanisters>;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to retrieve BTC.');

	progress(UpdateBalanceCkBtcStep.RETRIEVE);

	await updateBalanceApi({
		identity,
		minterCanisterId
	});

	progress(UpdateBalanceCkBtcStep.RELOAD);

	await waitForMilliseconds(CKBTC_TRANSACTIONS_RELOAD_DELAY);

	emit({ message: 'oisyTriggerWallet' });
};

export const loadCkBtcMinterInfo = async (params: IcToken & Partial<IcCkCanisters>) =>
	loadCkBtcData({
		...params,
		store: ckBtcMinterInfoStore,
		request: (params) => minterInfo(params)
	});

export const loadBtcAddress = async (params: IcToken & Partial<IcCkCanisters>) =>
	loadCkBtcData({
		...params,
		store: btcAddressStore,
		request: (params) => getBtcAddress(params)
	});

const loadCkBtcData = async <T>({
	id: tokenId,
	minterCanisterId,
	store,
	request
}: IcToken &
	Partial<IcCkCanisters> & {
		store: CertifiedSetterStoreStore<CertifiedData<T>>;
		request: (
			options: QueryAndUpdateRequestParams & Pick<IcCkCanisters, 'minterCanisterId'>
		) => Promise<T>;
	}) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	const minterStore = get(store);

	// We try to load only once per session the information for performance reason
	if (minterStore?.[tokenId] !== undefined) {
		return;
	}

	busy.start({ msg: 'Loading minter data...' });

	await queryAndUpdate<T>({
		request: ({ identity: _, certified }) =>
			request({
				minterCanisterId,
				identity: new AnonymousIdentity(),
				certified
			}),
		onLoad: ({ response: data, certified }) => store.set({ tokenId, data: { data, certified } }),
		onCertifiedError: ({ error: err }) => {
			store.reset(tokenId);

			toastsError({
				msg: { text: 'Error while loading the ckBtc minter information.' },
				err
			});
		},
		identity: new AnonymousIdentity()
	});

	busy.stop();
};

export const queryEstimateFee = async ({
	identity,
	minterCanisterId,
	amount
}: Partial<IcCkCanisters> & {
	identity: OptionIdentity;
	amount: bigint;
}): Promise<{
	result: 'success' | 'error';
	fee?: EstimateWithdrawalFee;
}> => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

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
			msg: { text: 'Error while querying the estimation of the Btc fees.' },
			err
		});

		return { result: 'error' };
	}
};
