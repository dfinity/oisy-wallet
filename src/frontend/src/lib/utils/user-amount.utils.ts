import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import type { TokenActionErrorType } from '$lib/types/token-action';
import type { Option } from '$lib/types/utils';
import {
	assertAmount,
	assertCkBtcAmount,
	assertCkErc20Amount,
	assertCkEthAmount,
	assertErc20Amount
} from '$lib/utils/assert-amount.utils';
import { formatToken } from '$lib/utils/format.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { nonNullish } from '@dfinity/utils';

export const validateUserAmount = ({
	userAmount,
	token,
	balance,
	fee,
	balanceForFee,
	ethereumEstimateFee,
	minterInfo,
	isSwapFlow = false
}: {
	userAmount: bigint;
	token: Token;
	balance?: Balance;
	balanceForFee?: Balance;
	fee?: bigint;
	ethereumEstimateFee?: bigint;
	minterInfo?: Option<CkBtcMinterInfoData | CkEthMinterInfoData>;
	isSwapFlow?: boolean;
}): TokenActionErrorType => {
	// We should align balance and userAmount to avoid issues caused by comparing formatted and unformatted BN
	const parsedSendBalance = nonNullish(balance)
		? parseToken({
				value: formatToken({
					value: balance,
					unitName: token.decimals,
					displayDecimals: token.decimals
				}),
				unitName: token.decimals
			})
		: ZERO;

	// if the function called in the swap flow, we only need to check the basic assertAmount condition
	// if convert or send - we identify token type and check some network-specific conditions
	if (isSwapFlow) {
		return assertAmount({
			userAmount,
			balance: parsedSendBalance,
			fee
		});
	}

	if (isTokenErc20(token)) {
		return assertErc20Amount({
			userAmount,
			balance: parsedSendBalance,
			balanceForFee: balanceForFee ?? ZERO,
			fee
		});
	}

	if (isTokenCkBtcLedger(token)) {
		return assertCkBtcAmount({
			userAmount,
			balance: parsedSendBalance,
			minterInfo,
			fee
		});
	}

	if (isTokenCkEthLedger(token)) {
		return assertCkEthAmount({
			userAmount,
			balance: parsedSendBalance,
			minterInfo,
			fee
		});
	}

	if (isTokenCkErc20Ledger(token)) {
		return assertCkErc20Amount({
			userAmount,
			balance: parsedSendBalance,
			balanceForFee: balanceForFee ?? ZERO,
			ethereumEstimateFee,
			fee
		});
	}

	return assertAmount({
		userAmount,
		balance: parsedSendBalance,
		fee
	});
};
