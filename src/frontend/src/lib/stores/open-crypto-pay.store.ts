// stores/open-crypto-pay.store.ts
import type { OpenCryptoPayResponse, PayableTokenWithFees } from '$lib/types/open-crypto-pay';
// import {
// 	calculateUsdValues,
// 	findNativeToken,
// 	validateSufficientBalance
// } from '$lib/utils/open-crypto-pay.utils';
import { writable, type Readable } from 'svelte/store';

export interface PayContext {
	data: Readable<OpenCryptoPayResponse | undefined>;
	availableTokens: Readable<PayableTokenWithFees[]>;
	// selectedToken: Readable<PayableTokenWithFees | undefined>;
	setData: (payData: OpenCryptoPayResponse) => void;
	setSelectedToken: (token: PayableTokenWithFees) => void;
	setTokensWithFees: (tokens: PayableTokenWithFees[]) => void;
}

export const initPayContext = (): PayContext => {
	const data = writable<OpenCryptoPayResponse | undefined>(undefined);
	const tokensWithFees = writable<PayableTokenWithFees[]>([]);
	const selectedToken = writable<PayableTokenWithFees | undefined>(undefined);

	// const enrichedTokens = derived(
	// 	[tokensWithFees, enabledEvmTokens, enabledEthereumTokens, exchanges, balancesStore],
	// 	([$tokensWithFees, $evmTokens, $ethereumTokens, $exchanges, $balances]) => {
	// 		if ($tokensWithFees.length === 0) {
	// 			return [];
	// 		}

	// 		return $tokensWithFees
	// 			.map((token) => {
	// 				// Skip tokens without fees (failed fee calculation)
	// 				if (isNullish(token.fee)) {
	// 					return null;
	// 				}

	// 				// Only process Ethereum and EVM networks
	// 				if (!isNetworkIdEthereum(token.network.id) && !isNetworkIdEvm(token.network.id)) {
	// 					return null;
	// 				}

	// 				const nativeToken = findNativeToken({
	// 					networkId: token.network.id,
	// 					evmTokens: $evmTokens,
	// 					ethereumTokens: $ethereumTokens
	// 				});

	// 				if (!nativeToken) {
	// 					return null;
	// 				}

	// 				const nativeTokenPrice = $exchanges?.[nativeToken.id]?.usd;
	// 				const tokenPrice = $exchanges?.[token.id]?.usd;

	// 				if (isNullish(nativeTokenPrice) || isNullish(tokenPrice)) {
	// 					return null;
	// 				}

	// 				const tokenAmount = parseToken({
	// 					value: token.amount,
	// 					unitName: token.decimals
	// 				});

	// 				const hasSufficientBalance = validateSufficientBalance({
	// 					token,
	// 					tokenAmount,
	// 					feeInWei: token.fee.feeInWei,
	// 					nativeToken,
	// 					balances: $balances
	// 				});

	// 				if (!hasSufficientBalance) {
	// 					return null;
	// 				}

	// 				const usdValues = calculateUsdValues({
	// 					token,
	// 					nativeToken,
	// 					feeInWei: token.fee.feeInWei,
	// 					tokenPrice,
	// 					nativeTokenPrice
	// 				});

	// 				return {
	// 					...token,
	// 					...usdValues
	// 				} as PayableTokenWithFees;
	// 			})
	// 			.filter((token): token is PayableTokenWithFees => nonNullish(token));
	// 	}
	// );

	// const sortedTokens = derived([enrichedTokens], ([$enrichedTokens]) =>
	// 	$enrichedTokens.length > 0
	// 		? $enrichedTokens.sort((a, b) => (a.sumInUSD ?? 0) - (b.sumInUSD ?? 0))
	// 		: []
	// );

	// const activeToken = derived([sortedTokens, selectedToken], ([$sortedTokens, $selectedToken]) => {
	// 	if (nonNullish($selectedToken) && $sortedTokens.some((t) => t.id === $selectedToken.id)) {
	// 		return $selectedToken;
	// 	}
	// 	return $sortedTokens.length > 0 ? $sortedTokens[0] : undefined;
	// });

	return {
		data,
		availableTokens: tokensWithFees,
		// selectedToken: activeToken,
		setData: (payData: OpenCryptoPayResponse) => data.set(payData),
		setTokensWithFees: (tokens: PayableTokenWithFees[]) => {
			tokensWithFees.set(tokens);
			selectedToken.set(undefined);
		},
		setSelectedToken: (token: PayableTokenWithFees) => selectedToken.set(token)
	};
};

export const PAY_CONTEXT_KEY = Symbol('open-crypto-pay');
