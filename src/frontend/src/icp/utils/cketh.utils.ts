import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import type { EthereumFeeStoreData } from '$icp/stores/ethereum-fee.store';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO, ZERO_BI } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import type { Option } from '$lib/types/utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { fromNullable, isNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const assertCkETHMinWithdrawalAmount = ({
	amount,
	tokenDecimals,
	tokenSymbol,
	minterInfo,
	i18n
}: {
	amount: BigNumber;
	tokenDecimals: number;
	tokenSymbol: string;
	minterInfo: Option<CkEthMinterInfoData>;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount.isZero()) {
		return undefined;
	}

	if (isNullish(minterInfo)) {
		return new IcAmountAssertionError(i18n.send.assertion.unknown_minimum_cketh_amount);
	}

	const {
		data: { minimum_withdrawal_amount },
		certified: infoCertified
	} = minterInfo;

	// The `minimum_withdrawal_amount` is optional in the minter info because the team decided to make all fields optional for maintainability reasons. That's why we assume that it is most likely set.
	const minWithdrawalAmount = fromNullable(minimum_withdrawal_amount) ?? 0n;

	if ((amount?.toBigInt() ?? 0n) < minWithdrawalAmount) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_cketh_amount, {
				$amount: formatToken({
					value: minWithdrawalAmount,
					unitName: tokenDecimals,
					displayDecimals: tokenDecimals
				}),
				$symbol: tokenSymbol
			})
		);
	}

	if (!infoCertified) {
		return new IcAmountAssertionError(i18n.send.info.cketh_certified);
	}

	return undefined;
};

export const assertCkETHMinFee = ({
	amount,
	fee,
	tokenSymbol,
	i18n
}: {
	amount: BigNumber;
	fee: bigint;
	tokenSymbol: string;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount.isZero()) {
		return undefined;
	}

	if (BigNumber.from(fee).gt(amount)) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_ledger_fees, {
				$symbol: tokenSymbol
			})
		);
	}

	return undefined;
};

export const assertCkETHBalanceEstimatedFee = ({
	balance,
	tokenCkEth,
	feeStoreData,
	i18n
}: {
	balance: OptionBalance;
	tokenCkEth: IcToken | undefined;
	feeStoreData: EthereumFeeStoreData;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	const ethBalance = balance ?? ZERO;

	// We skip validation checks here for zero balance because it makes the UI/UX ungraceful if the balance is just not yet loaded.
	if (ethBalance === ZERO_BI) {
		return undefined;
	}

	if (isNullish(tokenCkEth)) {
		return new IcAmountAssertionError(i18n.send.assertion.unknown_cketh);
	}

	const { decimals, symbol } = tokenCkEth;

	const estimatedFee = BigNumber.from(feeStoreData?.maxTransactionFee ?? 0n);

	if (estimatedFee.gt(ethBalance)) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_cketh_balance, {
				$amount: formatToken({
					value: estimatedFee.toBigInt(),
					unitName: decimals,
					displayDecimals: decimals
				}),
				$symbol: symbol
			})
		);
	}

	return undefined;
};
