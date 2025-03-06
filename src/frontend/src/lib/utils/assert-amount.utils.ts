import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import type { ConvertAmountErrorType } from '$lib/types/convert';
import type { Option } from '$lib/types/utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

interface CommonParams {
	userAmount: BigNumber;
	balance: BigNumber;
	fee?: bigint;
}

interface CommonParamsWithMinter extends CommonParams {
	minterInfo: Option<CkBtcMinterInfoData | CkEthMinterInfoData>;
}

interface CommonParamsWithBalanceForFee extends CommonParams {
	balanceForFee: BigNumber;
}

const assertBalance = ({ userAmount, balance }: CommonParams): ConvertAmountErrorType => {
	if (userAmount.gt(balance)) {
		return 'insufficient-funds';
	}
};

const assertUserAmountWithFee = ({
	userAmount,
	balance,
	fee
}: CommonParams): ConvertAmountErrorType => {
	if (nonNullish(fee) && userAmount.add(fee).gt(balance)) {
		return 'insufficient-funds-for-fee';
	}
};

const assertMinterInfo = ({
	minterInfo,
	userAmount
}: {
	userAmount: BigNumber;
	minterInfo: Option<CkBtcMinterInfoData | CkEthMinterInfoData>;
}): ConvertAmountErrorType => {
	if (isNullish(minterInfo)) {
		return 'unknown-minimum-amount';
	}

	const { certified: infoCertified, data } = minterInfo;

	const minimumAmount =
		'retrieve_btc_min_amount' in data
			? data.retrieve_btc_min_amount
			: 'minimum_withdrawal_amount' in data
				? (fromNullable(data.minimum_withdrawal_amount) ?? 0n)
				: undefined;

	if (nonNullish(minimumAmount) && userAmount.toBigInt() < minimumAmount) {
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
}: CommonParamsWithBalanceForFee): ConvertAmountErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (assertBalanceError) {
		return assertBalanceError;
	}

	if (nonNullish(fee) && balanceForFee.lt(fee)) {
		return 'insufficient-funds-for-fee';
	}
};

export const assertCkBtcAmount = ({
	userAmount,
	balance,
	minterInfo,
	fee
}: CommonParamsWithMinter) => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (assertBalanceError) {
		return assertBalanceError;
	}

	const assertMinterInfoError = assertMinterInfo({ minterInfo, userAmount });
	if (assertMinterInfoError) {
		return assertMinterInfoError;
	}

	const assertUserAmountWithFeeError = assertUserAmountWithFee({ userAmount, balance, fee });
	if (assertUserAmountWithFeeError) {
		return assertUserAmountWithFeeError;
	}
};

export const assertCkEthAmount = ({
	userAmount,
	balance,
	minterInfo,
	fee
}: CommonParamsWithMinter): ConvertAmountErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (assertBalanceError) {
		return assertBalanceError;
	}

	const assertMinterInfoError = assertMinterInfo({ minterInfo, userAmount });
	if (assertMinterInfoError) {
		return assertMinterInfoError;
	}

	if (nonNullish(fee) && userAmount.lt(fee)) {
		return 'amount-less-than-ledger-fee';
	}

	const assertUserAmountWithFeeError = assertUserAmountWithFee({ userAmount, balance, fee });
	if (assertUserAmountWithFeeError) {
		return assertUserAmountWithFeeError;
	}
};

export const assertCkErc20Amount = ({
	userAmount,
	balance,
	balanceForFee,
	fee,
	ethereumEstimateFee
}: CommonParamsWithBalanceForFee & { ethereumEstimateFee?: bigint }): ConvertAmountErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (assertBalanceError) {
		return assertBalanceError;
	}

	if (
		nonNullish(balanceForFee) &&
		nonNullish(ethereumEstimateFee) &&
		balanceForFee.lt(ethereumEstimateFee)
	) {
		return 'insufficient-funds-for-fee';
	}

	const assertUserAmountWithFeeError = assertUserAmountWithFee({ userAmount, balance, fee });
	if (assertUserAmountWithFeeError) {
		return assertUserAmountWithFeeError;
	}
};

export const assertAmount = ({
	userAmount,
	balance,
	fee
}: CommonParams): ConvertAmountErrorType => {
	const assertBalanceError = assertBalance({ userAmount, balance });
	if (assertBalanceError) {
		return assertBalanceError;
	}

	const assertUserAmountWithFeeError = assertUserAmountWithFee({ userAmount, balance, fee });
	if (assertUserAmountWithFeeError) {
		return assertUserAmountWithFeeError;
	}
};
