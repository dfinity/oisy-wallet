import { retrieveBtc } from '$icp/api/ckbtc-minter.api';
import { withdrawErc20, withdrawEth } from '$icp/api/cketh-minter.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcTransferParams } from '$icp/types/ic-send';
import type { IcCanisters, IcCkMetadata, IcCkToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { IcrcBlockIndex } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const convertCkBTCToBtc = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount,
	identity,
	to
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckbtc_btc);

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress?.(ProgressStepsSendIc.SEND);

	await retrieveBtc({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

/**
 * Withdrawal ckErc20 to Erc20.
 *
 * {@link https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc#withdrawal-ckerc20-to-erc20}
 */
export const convertCkErc20ToErc20 = async ({
	token,
	progress,
	identity,
	to,
	amount,
	ckErc20ToErc20MaxCkEthFees
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	const { minterCanisterId, ledgerCanisterId } = token;

	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_ckerc20_erc20);

	// The fees for ckERC20 are paid in ckETH so, the feeLedgerCanisterId is actually the ckETH ledger canister ID which we need to convert ckERC20 to ERC20
	const ckEthLedgerCanisterId = token.feeLedgerCanisterId;

	assertNonNullish(ckEthLedgerCanisterId, get(i18n).init.error.ledger_cketh_eth);

	assertNonNullish(
		ckErc20ToErc20MaxCkEthFees,
		get(i18n).send.assertion.cketh_max_transaction_fee_missing
	);

	// 1. Approve fees on ckETH Ledger for minter

	await approveTransfer({
		canisters: { ledgerCanisterId: ckEthLedgerCanisterId, minterCanisterId },
		identity,
		progress,
		progressStep: ProgressStepsSendIc.APPROVE_FEES,
		amount: ckErc20ToErc20MaxCkEthFees,
		to
	});

	// 2. Approve amount on ckErc20 Ledger for minter

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	// 3. Withdraw Erc20

	progress?.(ProgressStepsSendIc.SEND);

	await withdrawErc20({
		identity,
		minterCanisterId,
		ledgerCanisterId,
		address: to,
		amount
	});
};

export const convertCkETHToEth = async ({
	token: { ledgerCanisterId, minterCanisterId },
	progress,
	amount,
	identity,
	to
}: IcTransferParams & {
	token: IcCkToken;
}): Promise<void> => {
	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_cketh_eth);

	await approveTransfer({
		canisters: { ledgerCanisterId, minterCanisterId },
		identity,
		progress,
		amount,
		to
	});

	progress?.(ProgressStepsSendIc.SEND);

	await withdrawEth({
		identity,
		minterCanisterId,
		address: to,
		amount
	});
};

const approveTransfer = ({
	canisters: { ledgerCanisterId, minterCanisterId },
	progress,
	progressStep = ProgressStepsSendIc.APPROVE_TRANSFER,
	amount,
	identity
}: Omit<IcTransferParams, 'amount'> & {
	amount: bigint;
	progressStep?: ProgressStepsSendIc;
} & {
	canisters: Pick<IcCanisters, 'ledgerCanisterId'> & IcCkMetadata;
}): Promise<IcrcBlockIndex> => {
	progress?.(progressStep);

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
