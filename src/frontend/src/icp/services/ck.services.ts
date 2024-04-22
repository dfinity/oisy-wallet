import {
	IC_CKETH_LEDGER_CANISTER_ID,
	LOCAL_CKETH_LEDGER_CANISTER_ID,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$env/networks.ircrc.env';
import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { withdrawEth } from '$icp/api/cketh-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import { CKERC20_TO_ERC20_MAX_TRANSACTION_FEE } from '$icp/constants/cketh.constants';
import type { IcCanisters, IcCkMetadata, IcCkToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { LOCAL, NANO_SECONDS_IN_MINUTE, STAGING } from '$lib/constants/app.constants';
import { SendIcStep } from '$lib/enums/steps';
import { i18n } from '$lib/stores/i18n.store';
import type { IcrcBlockIndex } from '@dfinity/ledger-icrc';
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

export const convertCkErc20ToErc20 = async ({
	token,
	progress,
	identity,
	to,
	...rest
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	const { minterCanisterId } = token;

	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckerc20_erc20);

	// TODO: this is relatively ugly. We should find a way to derive those information cleany.

	const ledgerCanisterId = LOCAL
		? LOCAL_CKETH_LEDGER_CANISTER_ID
		: STAGING
			? STAGING_CKETH_LEDGER_CANISTER_ID
			: IC_CKETH_LEDGER_CANISTER_ID;

	assertNonNullish(ledgerCanisterId, get(i18n).init.error.ledger_cketh_eth);

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		progressStep: SendIcStep.APPROVE_FEES,
		amount: CKERC20_TO_ERC20_MAX_TRANSACTION_FEE,
		to
	});

	await convertCkETHToEth({
		token,
		progress,
		identity,
		to,
		...rest
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
	progressStep = SendIcStep.APPROVE_TRANSFER,
	amount,
	identity
}: Omit<IcTransferParams, 'amount'> & { amount: bigint; progressStep?: SendIcStep } & {
	canisters: Pick<IcCanisters, 'ledgerCanisterId'> & IcCkMetadata;
}): Promise<IcrcBlockIndex> => {
	progress(progressStep);

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
