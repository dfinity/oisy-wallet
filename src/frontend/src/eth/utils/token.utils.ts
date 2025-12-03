import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens/tokens.erc20.env';
import { ERC20_ICP_SYMBOL } from '$eth/constants/erc20-icp.constants';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableToken,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import type { OptionToken, Token, TokenId } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish } from '@dfinity/utils';
import { zeroPadValue } from 'ethers/utils';

export const isErc20Icp = (token: OptionToken): boolean =>
	token?.symbol === ERC20_ICP_SYMBOL && isTokenErc20(token);

export const isSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	ERC20_TWIN_TOKENS_IDS.includes(tokenId);

export const isNotSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	!isSupportedErc20TwinTokenId(tokenId);

// ERC20 token addresses are zero-padded to 32 bytes (64 characters) string in hex format, when they need to be ABI-encoded.
export const tokenAddressToHex = (address: string): string =>
	zeroPadValue(address.toLowerCase(), 32);

export const hasSufficientBalance = ({
	token,
	tokenAmount,
	feeInWei,
	nativeToken,
	balances
}: {
	token: PayableToken;
	tokenAmount: bigint;
	feeInWei: bigint;
	nativeToken: Token;
	balances: CertifiedStoreData<BalancesData>;
}): boolean => {
	const isNative = isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id);

	if (isNative) {
		const requiredBalance = tokenAmount + feeInWei;
		const userBalance = balances?.[nativeToken.id]?.data ?? ZERO;

		return userBalance >= requiredBalance;
	}

	if (isTokenErc20(token)) {
		const tokenBalance = balances?.[token.id]?.data ?? ZERO;
		const nativeBalance = balances?.[nativeToken.id]?.data ?? ZERO;

		return tokenBalance >= tokenAmount && nativeBalance >= feeInWei;
	}

	return false;
};

export const calculateUsdValues = ({
	token,
	nativeToken,
	feeInWei,
	tokenPrice,
	nativeTokenPrice
}: {
	token: PayableToken;
	nativeToken: Token;
	feeInWei: bigint;
	tokenPrice: number;
	nativeTokenPrice: number;
}): {
	amountInUSD: number;
	feeInUSD: number;
	sumInUSD: number;
} => {
	const feeInNativeToken = Number(
		formatToken({
			value: feeInWei,
			unitName: nativeToken.decimals,
			displayDecimals: nativeToken.decimals
		})
	);

	const amountInUSD = Number(token.amount) * tokenPrice;
	const feeInUSD = feeInNativeToken * nativeTokenPrice;

	return {
		amountInUSD,
		feeInUSD,
		sumInUSD: amountInUSD + feeInUSD
	};
};

/**
 * Enriches ETH/EVM token with USD values and validates sufficient balance.
 */
export const enrichEthEvmToken = ({
	token,
	nativeTokens,
	exchanges,
	balances
}: {
	token: PayableTokenWithFees;
	nativeTokens: Token[];
	exchanges: ExchangesData | undefined;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount | undefined => {
	if (isNullish(token.fee)) {
		return;
	}

	const nativeToken = nativeTokens.find(({ network: { id } }) => id === token.network.id);

	if (isNullish(nativeToken)) {
		return;
	}

	const nativeTokenPrice = exchanges?.[nativeToken.id]?.usd;
	const tokenPrice = exchanges?.[token.id]?.usd;

	if (isNullish(nativeTokenPrice) || isNullish(tokenPrice)) {
		return;
	}

	const tokenAmount = parseToken({
		value: token.amount,
		unitName: token.decimals
	});

	const isBalanceSufficient = hasSufficientBalance({
		token,
		tokenAmount,
		feeInWei: token.fee.feeInWei,
		nativeToken,
		balances
	});

	if (!isBalanceSufficient) {
		return;
	}

	const usdValues = calculateUsdValues({
		token,
		nativeToken,
		feeInWei: token.fee.feeInWei,
		tokenPrice,
		nativeTokenPrice
	});

	return {
		...token,
		...usdValues
	};
};
