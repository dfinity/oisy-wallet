import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import type { EthereumFeeStoreData } from '$icp/stores/ethereum-fee.store';
import { IcAmountAssertionError } from '$icp/types/ic-send';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import type { Option } from '$lib/types/utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { fromNullable, isNullish } from '@dfinity/utils';

export const assertCkETHMinWithdrawalAmount = ({
	amount,
	tokenDecimals,
	tokenSymbol,
	minterInfo,
	i18n
}: {
	amount: bigint;
	tokenDecimals: number;
	tokenSymbol: string;
	minterInfo: Option<CkEthMinterInfoData>;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount === ZERO) {
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
	const minWithdrawalAmount = fromNullable(minimum_withdrawal_amount) ?? ZERO;

	if ((amount ?? ZERO) < minWithdrawalAmount) {
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
	amount: bigint;
	fee: bigint;
	tokenSymbol: string;
	i18n: I18n;
}): IcAmountAssertionError | undefined => {
	// We skip validation checks here for zero because it makes the UI/UX ungraceful.
	// e.g. user enters 0. and an error gets displayed.
	if (amount === ZERO) {
		return undefined;
	}

	if (fee > amount) {
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
	if (ethBalance === ZERO) {
		return undefined;
	}

	if (isNullish(tokenCkEth)) {
		return new IcAmountAssertionError(i18n.send.assertion.unknown_cketh);
	}

	const { decimals, symbol } = tokenCkEth;

	const estimatedFee = feeStoreData?.maxTransactionFee ?? ZERO;

	if (estimatedFee > ethBalance) {
		return new IcAmountAssertionError(
			replacePlaceholders(i18n.send.assertion.minimum_cketh_balance, {
				$amount: formatToken({
					value: estimatedFee,
					unitName: decimals,
					displayDecimals: decimals
				}),
				$symbol: symbol
			})
		);
	}

	return undefined;
};
