import {
	estimateFee,
	getBtcAddress,
	minterInfo,
	updateBalance as updateBalanceApi
} from '$icp/api/ckbtc-minter.api';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { waitAndTriggerWallet } from '$icp/utils/ic-wallet.utils';
import { queryAndUpdate, type QueryAndUpdateRequestParams } from '$lib/actors/query.ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { busy } from '$lib/stores/busy.store';
import type { CertifiedSetterStoreStore } from '$lib/stores/certified-setter.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { CertifiedData } from '$lib/types/store';
import { AnonymousIdentity } from '@dfinity/agent';
import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
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

	await waitAndTriggerWallet();
};

export const loadAllCkBtcInfo = async ({
	id: tokenId,
	minterCanisterId,
	...rest
}: IcToken & Partial<IcCkCanisters> & { identity: OptionIdentity }) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	const addressStore = get(btcAddressStore);
	const minterInfoStore = get(ckBtcMinterInfoStore);

	const addressLoaded = nonNullish(addressStore?.[tokenId]);
	const infoLoaded = nonNullish(minterInfoStore?.[tokenId]);

	// We try to load only once per session the information for performance reason
	if (addressLoaded && infoLoaded) {
		return;
	}

	busy.start({ msg: 'Hold tight, we are loading some information...' });

	const params = {
		id: tokenId,
		minterCanisterId,
		...rest
	};

	await Promise.all([
		addressLoaded ? Promise.resolve() : loadBtcAddress(params),
		infoLoaded
			? Promise.resolve()
			: loadCkBtcMinterInfo({
					params,
					fn: loadData
				})
	]);

	busy.stop();
};

export const loadCkBtcMinterInfo = async ({
	params,
	fn = loadDataOnce
}: {
	fn?: LoadData;
	params: IcToken & Partial<IcCkCanisters>;
}) =>
	fn({
		...params,
		store: ckBtcMinterInfoStore,
		request: (params) => minterInfo(params),
		identity: new AnonymousIdentity()
	});

const loadBtcAddress = async (
	params: IcToken & Partial<IcCkCanisters> & { identity: OptionIdentity }
) =>
	loadData({
		...params,
		store: btcAddressStore,
		request: (params) => getBtcAddress(params)
	});

type LoadData = <T>(params: LoadDataParams<T>) => Promise<void>;

type LoadDataParams<T> = IcToken &
	Partial<IcCkCanisters> & {
		store: CertifiedSetterStoreStore<CertifiedData<T>>;
		request: (
			options: QueryAndUpdateRequestParams & Pick<IcCkCanisters, 'minterCanisterId'>
		) => Promise<T>;
		identity: OptionIdentity;
	};

const loadDataOnce: LoadData = async <T>({
	id: tokenId,
	minterCanisterId,
	store,
	...rest
}: LoadDataParams<T>) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	const minterStore = get(store);

	// We try to load only once per session the information for performance reason
	if (nonNullish(minterStore?.[tokenId])) {
		return;
	}

	busy.start({ msg: 'Hold tight, we are loading some information...' });

	await loadData<T>({
		id: tokenId,
		minterCanisterId,
		store,
		...rest
	});

	busy.stop();
};

const loadData: LoadData = async <T>({
	id: tokenId,
	minterCanisterId,
	store,
	request,
	identity
}: LoadDataParams<T>) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	await queryAndUpdate<T>({
		request: ({ identity, certified }) =>
			request({
				minterCanisterId,
				identity,
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
		identity
	});
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
