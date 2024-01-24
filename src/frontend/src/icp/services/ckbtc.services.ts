import { minterInfo, updateBalance as updateBalanceApi } from '$icp/api/ckbtc-minter.api';
import { CKBTC_TRANSACTIONS_RELOAD_DELAY } from '$icp/constants/ckbtc.constants';
import { CKBTC_MINTER_CANISTER_ID } from '$icp/constants/icrc.constants';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { toastsError } from '$lib/stores/toasts.store';
import { emit } from '$lib/utils/events.utils';
import { AnonymousIdentity } from '@dfinity/agent';
import type { MinterInfo } from '@dfinity/ckbtc';
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

	const waitForMilliseconds = (milliseconds: number): Promise<void> =>
		new Promise((resolve) => {
			setTimeout(resolve, milliseconds);
		});

	await waitForMilliseconds(CKBTC_TRANSACTIONS_RELOAD_DELAY);

	emit({ message: 'oisyTriggerWallet' });
};

export const loadCkBtcMinterInfo = async () => {
	const minterInfoStore = get(ckBtcMinterInfoStore);

	// We try to load only once per session the information for performance reason
	if (minterInfoStore !== undefined) {
		return;
	}

	await queryAndUpdate<MinterInfo>({
		request: ({ identity: _, certified }) =>
			minterInfo({
				minterCanisterId: CKBTC_MINTER_CANISTER_ID,
				identity: new AnonymousIdentity(),
				certified
			}),
		onLoad: ({ response: data, certified }) => ckBtcMinterInfoStore.set({ data, certified }),
		onCertifiedError: ({ error: err }) => {
			ckBtcMinterInfoStore.reset();

			toastsError({
				msg: { text: 'Error while loading the ckBtc minter information.' },
				err
			});
		},
		identity: new AnonymousIdentity()
	});
};
