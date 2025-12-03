import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { enrichTokensWithUsdAndBalance } from '$lib/utils/open-crypto-pay.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface PayContext {
	data: Readable<OpenCryptoPayResponse | undefined>;
	availableTokens: Readable<PayableTokenWithConvertedAmount[]>;
	selectedToken: Readable<PayableTokenWithConvertedAmount | undefined>;
	setData: (payData: OpenCryptoPayResponse) => void;
	setTokens: (tokens: PayableTokenWithFees[]) => void;
	selectToken: (token: PayableTokenWithConvertedAmount) => void;
}

export const initPayContext = (): PayContext => {
	const data = writable<OpenCryptoPayResponse | undefined>(undefined);
	const availableTokens = writable<PayableTokenWithFees[]>([]);
	const userSelection = writable<PayableTokenWithConvertedAmount | undefined>(undefined);
	const { set: setData } = data;

	const sufficientTokens = derived(
		[availableTokens, enabledEvmTokens, enabledEthereumTokens, exchanges, balancesStore],
		([$availableTokens, $enabledEvmTokens, $enabledEthereumTokens, $exchanges, $balances]) => {
			if ($availableTokens.length === 0 || isNullish($exchanges)) {
				return [];
			}

			return enrichTokensWithUsdAndBalance({
				tokens: $availableTokens,
				nativeTokens: [...$enabledEvmTokens, ...$enabledEthereumTokens],
				exchanges: $exchanges,
				balances: $balances
			});
		}
	);

	const tokensSorted = derived([sufficientTokens], ([$sufficientTokens]) =>
		$sufficientTokens.length > 0
			? $sufficientTokens.sort((a, b) => (a.sumInUSD ?? 0) - (b.sumInUSD ?? 0))
			: []
	);

	const selectedToken = derived(
		[tokensSorted, userSelection],
		([$tokensSorted, $userSelection]) => {
			if (nonNullish($userSelection) && $tokensSorted.find((t) => t.id === $userSelection.id)) {
				return $userSelection;
			}
			return $tokensSorted.length > 0 ? $tokensSorted[0] : undefined;
		}
	);

	return {
		data,
		availableTokens: tokensSorted,
		selectedToken,
		setData,
		setTokens: (tokens: PayableTokenWithFees[]) => {
			availableTokens.set(tokens);
			userSelection.set(undefined);
		},
		selectToken: (token: PayableTokenWithConvertedAmount) => userSelection.set(token)
	};
};

export const PAY_CONTEXT_KEY = Symbol('open-crypto-pay');
