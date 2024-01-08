import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { SendStep } from '$lib/enums/steps';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const convertCkBTCToBtc = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: IcTransferParams & {
	token: IcToken & Partial<IcCkCanisters>;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to convert ckBTC to BTC.');

	progress(SendStep.APPROVE);

	const amount = amountBigNumber.toBigInt();

	await approve({
		identity,
		ledgerCanisterId,
		amount,
		expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
		spender: {
			owner: Principal.from(minterCanisterId)
		}
	});

	progress(SendStep.SEND);

	await retrieveBtc({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};
