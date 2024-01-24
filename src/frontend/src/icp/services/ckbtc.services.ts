import { minterInfo, updateBalance as updateBalanceApi } from '$icp/api/ckbtc-minter.api';
import { CKBTC_TRANSACTIONS_RELOAD_DELAY } from '$icp/constants/ckbtc.constants';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc-info.store';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { busy } from '$lib/stores/busy.store';
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

export const loadCkBtcMinterInfo = async ({
	id: tokenId,
	minterCanisterId
}: IcToken & Partial<IcCkCanisters>) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	const minterInfoStore = get(ckBtcMinterInfoStore);

	// We try to load only once per session the information for performance reason
	if (minterInfoStore?.[tokenId] !== undefined) {
		return;
	}

	busy.start({ msg: 'Loading minter data...' });

	await queryAndUpdate<MinterInfo>({
		request: ({ identity: _, certified }) =>
			minterInfo({
				minterCanisterId,
				identity: new AnonymousIdentity(),
				certified
			}),
		onLoad: ({ response: data, certified }) =>
			ckBtcMinterInfoStore.set({ tokenId, data: { data, certified } }),
		onCertifiedError: ({ error: err }) => {
			ckBtcMinterInfoStore.reset(tokenId);

			toastsError({
				msg: { text: 'Error while loading the ckBtc minter information.' },
				err
			});
		},
		identity: new AnonymousIdentity()
	});

	busy.stop();
};
