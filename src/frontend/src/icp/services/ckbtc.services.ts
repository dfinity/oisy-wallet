import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { SendStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { SendParams, TransferParams } from '$lib/types/send';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const convertCkBTCToBtc = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	token: IcToken & Partial<IcCkCanisters>;
} & Pick<SendParams, 'progress'>): Promise<void> => {
	progress(SendStep.INITIALIZATION);

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
