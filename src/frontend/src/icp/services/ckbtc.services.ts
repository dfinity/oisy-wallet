import {
	estimateFee,
	getBtcAddress,
	minterInfo,
	updateBalance as updateBalanceApi
} from '$icp/api/ckbtc-minter.api';
import { loadCkData } from '$icp/services/ck.services';
import { btcAddressStore, ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { waitAndTriggerWallet } from '$icp/utils/ic-wallet.utils';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { AnonymousIdentity } from '@dfinity/agent';
import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import { assertNonNullish } from '@dfinity/utils';

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

export const loadCkBtcMinterInfo = async (params: IcToken & Partial<IcCkCanisters>) =>
	loadCkData({
		...params,
		store: ckBtcMinterInfoStore,
		request: (params) => minterInfo(params),
		identity: new AnonymousIdentity()
	});

export const loadBtcAddress = async (
	params: IcToken & Partial<IcCkCanisters> & { identity: OptionIdentity }
) =>
	loadCkData({
		...params,
		store: btcAddressStore,
		request: (params) => getBtcAddress(params)
	});

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
