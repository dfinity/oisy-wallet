import type { BlockIndex } from '$declarations/icp_ledger/icp_ledger.did';
import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { withdrawEth } from '$icp/api/cketh-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcCanisters, IcCkMetadata, IcCkToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { SendIcStep } from '$lib/enums/steps';
import { i18n } from '$lib/stores/i18n.store';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const convertCkBTCToBtc = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckbtc_btc);

	const amount = amountBigNumber.toBigInt();

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress(SendIcStep.SEND);

	await retrieveBtc({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

export const convertCkETHToEth = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount: amountBigNumber,
	identity,
	to
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_cketh_eth);

	const amount = amountBigNumber.toBigInt();

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress(SendIcStep.SEND);

	await withdrawEth({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

const approveTransfer = async ({
	canisters: { ledgerCanisterId, minterCanisterId },
	progress,
	amount,
	identity
}: Omit<IcTransferParams, 'amount'> & { amount: bigint } & {
	canisters: Pick<IcCanisters, 'ledgerCanisterId'> & IcCkMetadata;
}): Promise<BlockIndex> => {
	progress(SendIcStep.APPROVE);

	return approve({
		identity,
		ledgerCanisterId,
		amount,
		expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
		spender: {
			owner: Principal.from(minterCanisterId)
		}
	});
};
