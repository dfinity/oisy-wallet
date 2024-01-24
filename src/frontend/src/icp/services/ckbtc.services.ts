import { updateBalance as updateBalanceApi } from '$icp/api/ckbtc-minter.api';
import { CKBTC_TRANSACTIONS_RELOAD_DELAY } from '$icp/constants/ckbtc.constants';
import type { CkBtcUpdateBalanceParams } from '$icp/types/ckbtc';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import { emit } from '$lib/utils/events.utils';
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

	const waitForMilliseconds = (milliseconds: number): Promise<void> =>
		new Promise((resolve) => {
			setTimeout(resolve, milliseconds);
		});

	await waitForMilliseconds(CKBTC_TRANSACTIONS_RELOAD_DELAY);

	emit({ message: 'oisyTriggerWallet' });
};
