import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import { ZERO } from '$lib/constants/app.constants';
import type { Balance } from '$lib/types/balance';
import type { TokenActionErrorType } from '$lib/types/token-action';
import type { Option } from '$lib/types/utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';

interface CommonParams {
	userAmount: bigint;
	balance: Balance;
	fee?: bigint;
}

interface CommonParamsWithMinter extends CommonParams {
	minterInfo: Option<CkBtcMinterInfoData | CkEthMinterInfoData>;
}

interface CommonParamsWithBalanceForFee extends CommonParams {
	balanceForFee: Balance;
}

const assertBalance = ({ userAmount, balance }: CommonParams): TokenActionErrorType => {
	if (userAmount > balance) {
		return 'insufficient-funds';
	}
};

const assertUserAmountWithFee = ({
	userAmount,
	balance,
	fee
}: CommonParams): TokenActionErrorType => {
	if (nonNullish(fee) && userAmount + fee > balance) {
		return 'insufficient-funds-for-fee';
	}
};

const assertMinterInfo = ({
	minterInfo,
	userAmount
}: {
	userAmount: bigint;
	minterInfo: Option<CkBtcMinterInfoData | CkEthMinterInfoData>;
}): TokenActionErrorType => {
	if (isNullish(minterInfo)) {
		return 'unknown-minimum-amount';
	}

	const { certified: infoCertified, data } = minterInfo;

	const minimumAmount =
		'retrieve_btc_min_amount' in data
			? data.retrieve_btc_min_amount
			: 'minimum_withdrawal_amount' in data
				? (fromNullable(data.minimum_withdrawal_amount) ?? ZERO)
				: undefined;

	if (nonNullish(minimumAmount) && userAmount < minimumAmount) {
		return 'minimum-amount-not-reached';
	}

	if (!infoCertified) {
		return 'minter-info-not-certified';
	}
};

export const assertErc20Amount = ({
	userAmount,
	balance,
	balanceForFee,
	fee
}: CommonParamsWithBalanceForFee): TokenActionErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (nonNullish(assertBalanceError)) {
		return assertBalanceError;
	}

	if (nonNullish(fee) && balanceForFee < fee) {
		return 'insufficient-funds-for-fee';
	}
};

export const assertCkBtcAmount = ({
	userAmount,
	balance,
	minterInfo,
	fee
}: CommonParamsWithMinter) =>
	assertBalance({ userAmount, balance }) ??
	assertMinterInfo({ minterInfo, userAmount }) ??
	assertUserAmountWithFee({ userAmount, balance, fee });

export const assertCkEthAmount = ({
	userAmount,
	balance,
	minterInfo,
	fee
}: CommonParamsWithMinter): TokenActionErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (nonNullish(assertBalanceError)) {
		return assertBalanceError;
	}

	const assertMinterInfoError = assertMinterInfo({ minterInfo, userAmount });
	if (nonNullish(assertMinterInfoError)) {
		return assertMinterInfoError;
	}

	if (nonNullish(fee) && userAmount < fee) {
		return 'amount-less-than-ledger-fee';
	}

	return assertUserAmountWithFee({ userAmount, balance, fee });
};

export const assertCkErc20Amount = ({
	userAmount,
	balance,
	balanceForFee,
	fee,
	ethereumEstimateFee
}: CommonParamsWithBalanceForFee & {
	ethereumEstimateFee?: bigint;
}): TokenActionErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (nonNullish(assertBalanceError)) {
		return assertBalanceError;
	}

	if (
		nonNullish(balanceForFee) &&
		nonNullish(ethereumEstimateFee) &&
		balanceForFee < ethereumEstimateFee
	) {
		return 'insufficient-funds-for-fee';
	}

	return assertUserAmountWithFee({ userAmount, balance, fee });
};

export const assertAmount = ({ userAmount, balance, fee }: CommonParams): TokenActionErrorType =>
	assertBalance({ userAmount, balance }) ?? assertUserAmountWithFee({ userAmount, balance, fee });
