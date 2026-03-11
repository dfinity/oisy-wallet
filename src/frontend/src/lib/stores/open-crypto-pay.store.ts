import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
import { currentCurrency } from '$lib/derived/currency.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { currentLanguage } from '$lib/derived/i18n.derived';
import type { Currency } from '$lib/enums/currency';
import type { Languages } from '$lib/enums/languages';
import { balancesStore } from '$lib/stores/balances.store';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import type { CurrencyExchangeData } from '$lib/types/currency';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { formatCurrencyAsNumber } from '$lib/utils/format.utils';
import {
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP
} from '$lib/utils/network.utils';
import { enrichTokensWithUsdAndBalance } from '$lib/utils/open-crypto-pay.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

export interface PayContext {
	data: Readable<OpenCryptoPayResponse | undefined>;
	availableTokens: Readable<PayableTokenWithConvertedAmount[]>;
	selectedToken: Readable<PayableTokenWithConvertedAmount | undefined>;
	setData: (payData: OpenCryptoPayResponse) => void;
	setAvailableTokens: (tokens: PayableTokenWithFees[]) => void;
	selectToken: (token: PayableTokenWithConvertedAmount) => void;
	reset: () => void;
	failedPaymentError: Writable<string | undefined>;
}

const getNetworkTypePriority = ({ network: { id } }: PayableTokenWithConvertedAmount): number => {
	if (isNetworkIdICP(id)) {
		return 0;
	}

	if (isNetworkIdEthereum(id) || isNetworkIdEvm(id)) {
		return 1;
	}

	if (isNetworkIdBitcoin(id)) {
		return 2;
	}

	return 3;
};

export const createTokenComparator =
	({
		currency,
		exchangeRate,
		language
	}: {
		currency: Currency;
		exchangeRate: CurrencyExchangeData;
		language: Languages;
	}) =>
	// eslint-disable-next-line local-rules/prefer-object-params -- This is a sort function.
	(a: PayableTokenWithConvertedAmount, b: PayableTokenWithConvertedAmount): number => {
		// Sort by visual balance (fiat value) ascending
		const aSum = formatCurrencyAsNumber({
			value: a.sumInUSD,
			currency,
			exchangeRate,
			language
		});
		const bSum = formatCurrencyAsNumber({
			value: b.sumInUSD,
			currency,
			exchangeRate,
			language
		});
		const sumDiff = Number(aSum ?? 0) - Number(bSum ?? 0);
		if (sumDiff !== 0) {
			return sumDiff;
		}

		const networkDiff = getNetworkTypePriority(a) - getNetworkTypePriority(b);
		if (networkDiff !== 0) {
			return networkDiff;
		}

		const symbolDiff = a.symbol.localeCompare(b.symbol);
		if (symbolDiff !== 0) {
			return symbolDiff;
		}

		return a.network.name.localeCompare(b.network.name);
	};

export const initPayContext = (): PayContext => {
	const data = writable<OpenCryptoPayResponse | undefined>(undefined);
	const availableTokens = writable<PayableTokenWithFees[]>([]);
	const userSelection = writable<PayableTokenWithConvertedAmount | undefined>(undefined);
	const { set: setData } = data;

	const sufficientTokens = derived(
		[
			availableTokens,
			enabledMainnetBitcoinToken,
			enabledEthEvmNativeTokens,
			exchanges,
			balancesStore
		],
		([
			$availableTokens,
			$enabledMainnetBitcoinToken,
			$enabledEthEvmNativeTokens,
			$exchanges,
			$balances
		]) => {
			if ($availableTokens.length === 0 || isNullish($exchanges)) {
				return [];
			}

			return enrichTokensWithUsdAndBalance({
				tokens: $availableTokens,
				nativeTokens: [
					...$enabledEthEvmNativeTokens,
					...(nonNullish($enabledMainnetBitcoinToken) ? [$enabledMainnetBitcoinToken] : [])
				],
				exchanges: $exchanges,
				balances: $balances
			});
		}
	);

	const tokensSorted = derived(
		[sufficientTokens, currentCurrency, currencyExchangeStore, currentLanguage],
		([$sufficientTokens, $currentCurrency, $currencyExchangeStore, $currentLanguage]) => {
			if ($sufficientTokens.length === 0) {
				return [];
			}

			const tokenComparator = createTokenComparator({
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			});

			return $sufficientTokens.sort(tokenComparator);
		}
	);

	const selectedToken = derived([tokensSorted, userSelection], ([$tokensSorted, $userSelection]) =>
		nonNullish($userSelection)
			? $tokensSorted.find((t) => t.id === $userSelection.id)
			: $tokensSorted.length > 0
				? $tokensSorted[0]
				: undefined
	);

	return {
		data,
		availableTokens: tokensSorted,
		selectedToken,
		failedPaymentError: writable<string | undefined>(undefined),
		setData,
		setAvailableTokens: (tokens: PayableTokenWithFees[]) => {
			availableTokens.set(tokens);
			userSelection.set(undefined);
		},
		selectToken: (token: PayableTokenWithConvertedAmount) => userSelection.set(token),
		reset: () => {
			setData(undefined);
			availableTokens.set([]);
			userSelection.set(undefined);
		}
	};
};

export const PAY_CONTEXT_KEY = Symbol('open-crypto-pay');
