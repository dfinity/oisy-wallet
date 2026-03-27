import type { TokenId } from '$declarations/backend/backend.did';
import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getExchangeRates } from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoCoinsId,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type { BackendExchangeRate } from '$lib/types/exchange';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import { tokenIdKey } from '$lib/utils/token-id.utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const fetchIcrcPricesFromCoingecko = (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> =>
	simpleTokenPrice({
		id: 'internet-computer',
		vs_currencies: Currency.USD,
		contract_addresses: ledgerCanisterIds,
		include_market_cap: true,
		include_24hr_change: true
	});

const fetchIcrcPricesFromKongSwap = async (
	missingIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	const tokens = await fetchBatchKongSwapPrices(missingIds);

	return formatKongSwapToCoingeckoPrices(tokens);
};

// To calculate an FX rate for a currency vs USD, we cross-reference a very liquid asset (BTC) with the currency and with the USD.
// In this way, we can easily calculate the cross USDXXX rate as BTCUSD / BTCXXX.
// We will use it to convert the USD amounts to the currency amounts in the frontend.
// Until we find a proper IC solution (like the exchange canister, for example), we use this workaround.
export const exchangeRateUsdToCurrency = async (
	currency: Currency
): Promise<{ rate: number; fx24hChangeMultiplier: number } | undefined> => {
	if (currency === Currency.USD) {
		return { rate: 1, fx24hChangeMultiplier: 1 };
	}

	const prices = await simplePrice({
		ids: 'bitcoin',
		vs_currencies: `${Currency.USD},${currency}`,
		include_24hr_change: true
	});

	const btcToUsd = prices?.bitcoin?.usd;
	const btcToCurrency = prices?.bitcoin?.[currency];

	const btcToUsdChangePct = prices?.bitcoin?.usd_24h_change;
	const btcToCurrencyChangePct = prices?.bitcoin?.[`${currency}_24h_change`];

	if (
		isNullish(btcToUsd) ||
		isNullish(btcToCurrency) ||
		isNullish(btcToUsdChangePct) ||
		isNullish(btcToCurrencyChangePct)
	) {
		return;
	}

	const rate = btcToUsd / btcToCurrency;

	const a = btcToUsdChangePct / 100;
	const b = btcToCurrencyChangePct / 100;
	const fx24hChangeMultiplier = (1 + a) / (1 + b);

	return { rate, fx24hChangeMultiplier };
};

export const exchangeRateETHToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'internet-computer',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'solana',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRatePOLToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	simplePrice({
		ids: 'polygon-ecosystem-token',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateERC20ToUsd = async ({
	coingeckoPlatformId: id,
	contractAddresses
}: CoingeckoErc20PriceParams): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (contractAddresses.length === 0) {
		return {};
	}

	return await simpleTokenPrice({
		id,
		vs_currencies: Currency.USD,
		contract_addresses: contractAddresses.map(({ address }) => address),
		include_market_cap: true,
		include_24hr_change: true
	});
};

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (ledgerCanisterIds.length === 0) {
		return {};
	}

	const coingeckoPrices = await fetchIcrcPricesFromCoingecko(ledgerCanisterIds);
	const missingIds = findMissingLedgerCanisterIds({
		allLedgerCanisterIds: ledgerCanisterIds,
		coingeckoResponse: coingeckoPrices
	});
	if (missingIds.length === 0) {
		return coingeckoPrices;
	}

	const kongSwapPrices = await fetchIcrcPricesFromKongSwap(missingIds);
	return {
		...coingeckoPrices,
		...kongSwapPrices
	};
};

export const exchangeRateSPLToUsd = async (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (tokenAddresses.length === 0) {
		return {};
	}

	return await simpleTokenPrice({
		id: 'solana',
		vs_currencies: Currency.USD,
		contract_addresses: tokenAddresses,
		include_market_cap: true,
		include_24hr_change: true
	});
};

const mapExchangeRateToCoingecko = (
	rate: BackendExchangeRate | undefined
): CoingeckoSimpleTokenPrice | undefined => {
	if (isNullish(rate?.usd.price)) {
		return;
	}

	return {
		usd: rate.usd.price,
		usd_24h_change: rate.usd.price24hChangePct,
		usd_market_cap: rate.usd.marketCap ?? 0
	};
};

const nativePrice = ({
	tokenId,
	coingeckoKey,
	coingeckoRates
}: NativeTokenEntry & {
	coingeckoRates: Map<string, CoingeckoSimpleTokenPrice>;
}): CoingeckoSimplePriceResponse | undefined => {
	const key = tokenIdKey(tokenId);

	const rate = nonNullish(key) ? coingeckoRates.get(key) : undefined;

	return nonNullish(rate) ? { [coingeckoKey]: rate } : undefined;
};

interface NativeTokenEntry {
	tokenId: TokenId;
	coingeckoKey: CoingeckoCoinsId;
}

const ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: ETHEREUM_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
const BTC_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { BtcNativeMainnet: null },
	coingeckoKey: 'bitcoin'
};
const ICP_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { IcpNative: null },
	coingeckoKey: 'internet-computer'
};
const SOL_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { SolNativeMainnet: null },
	coingeckoKey: 'solana'
};
const BNB_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: BSC_MAINNET_NETWORK.chainId },
	coingeckoKey: 'binancecoin'
};
const POL_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: POLYGON_MAINNET_NETWORK.chainId },
	coingeckoKey: 'polygon-ecosystem-token'
};
const ARBITRUM_ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: ARBITRUM_MAINNET_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
const BASE_ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: BASE_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
const NATIVE_TOKEN_IDS: NativeTokenEntry[] = [
	ETH_NATIVE_ENTRY,
	BTC_NATIVE_ENTRY,
	ICP_NATIVE_ENTRY,
	SOL_NATIVE_ENTRY,
	BNB_NATIVE_ENTRY,
	POL_NATIVE_ENTRY,
	ARBITRUM_ETH_NATIVE_ENTRY,
	BASE_ETH_NATIVE_ENTRY
];

const collectTokenPairs = <T>({
	items,
	toTokenId,
	toIdentifier
}: {
	items: T[];
	toTokenId: (item: T) => TokenId;
	toIdentifier: (item: T) => string;
}): { pairs: { identifier: string; key: string }[]; tokenIds: TokenId[] } =>
	items.reduce<{ pairs: { identifier: string; key: string }[]; tokenIds: TokenId[] }>(
		(acc, item) => {
			const tokenId = toTokenId(item);
			const key = tokenIdKey(tokenId);

			if (isNullish(key)) {
				return acc;
			}

			acc.tokenIds.push(tokenId);
			acc.pairs.push({ identifier: toIdentifier(item), key });

			return acc;
		},
		{ pairs: [], tokenIds: [] }
	);

const buildPriceMap = ({
	pairs,
	rates,
	normalizeId
}: {
	pairs: { identifier: string; key: string }[];
	rates: Map<string, CoingeckoSimpleTokenPrice>;
	normalizeId?: (id: string) => string;
}): CoingeckoSimpleTokenPriceResponse =>
	pairs.reduce<CoingeckoSimpleTokenPriceResponse>((acc, { identifier, key }) => {
		const rate = rates.get(key);

		if (nonNullish(rate)) {
			acc[normalizeId?.(identifier) ?? identifier] = rate;
		}

		return acc;
	}, {});

const lower = (id: string) => id.toLowerCase();

export const fetchAllExchangeRatesFromBackend = async ({
	identity,
	erc20Addresses,
	icrcCanisterIds,
	splTokenAddresses
}: {
	identity: Identity;
	erc20Addresses: Erc20ContractAddressWithNetwork[];
	icrcCanisterIds: LedgerCanisterIdText[];
	splTokenAddresses: SplTokenAddress[];
}): Promise<{
	currentEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentBtcPrice: CoingeckoSimplePriceResponse | undefined;
	currentIcpPrice: CoingeckoSimplePriceResponse | undefined;
	currentSolPrice: CoingeckoSimplePriceResponse | undefined;
	currentBnbPrice: CoingeckoSimplePriceResponse | undefined;
	currentPolPrice: CoingeckoSimplePriceResponse | undefined;
	currentArbitrumEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentBaseEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentErc20Prices: CoingeckoSimpleTokenPriceResponse;
	currentIcrcPrices: CoingeckoSimpleTokenPriceResponse;
	currentSplPrices: CoingeckoSimpleTokenPriceResponse;
}> => {
	const nativeTokenIds = NATIVE_TOKEN_IDS.map(({ tokenId }) => tokenId);

	const erc20 = collectTokenPairs({
		items: erc20Addresses,
		toTokenId: (t) => ({ Erc20: [t.address, t.chainId] }),
		toIdentifier: (t) => t.address
	});

	const icrc = collectTokenPairs({
		items: icrcCanisterIds,
		toTokenId: (id) => ({ Icrc: Principal.fromText(id) }),
		toIdentifier: (id) => id
	});

	const spl = collectTokenPairs({
		items: splTokenAddresses,
		toTokenId: (addr) => ({ SplMainnet: addr }),
		toIdentifier: (addr) => addr
	});

	const ratesByKey = await getExchangeRates({
		token_ids: [...nativeTokenIds, ...erc20.tokenIds, ...icrc.tokenIds, ...spl.tokenIds],
		certified: true,
		identity
	});

	const coingeckoRates = new Map<string, CoingeckoSimpleTokenPrice>();
	ratesByKey.forEach((rate, key) => {
		const mapped = mapExchangeRateToCoingecko(rate);

		if (nonNullish(mapped)) {
			coingeckoRates.set(key, mapped);
		}
	});

	return {
		currentEthPrice: nativePrice({ ...ETH_NATIVE_ENTRY, coingeckoRates }),
		currentBtcPrice: nativePrice({ ...BTC_NATIVE_ENTRY, coingeckoRates }),
		currentIcpPrice: nativePrice({ ...ICP_NATIVE_ENTRY, coingeckoRates }),
		currentSolPrice: nativePrice({ ...SOL_NATIVE_ENTRY, coingeckoRates }),
		currentBnbPrice: nativePrice({ ...BNB_NATIVE_ENTRY, coingeckoRates }),
		currentPolPrice: nativePrice({ ...POL_NATIVE_ENTRY, coingeckoRates }),
		currentArbitrumEthPrice: nativePrice({ ...ARBITRUM_ETH_NATIVE_ENTRY, coingeckoRates }),
		currentBaseEthPrice: nativePrice({ ...BASE_ETH_NATIVE_ENTRY, coingeckoRates }),
		currentErc20Prices: buildPriceMap({
			pairs: erc20.pairs,
			rates: coingeckoRates,
			normalizeId: lower
		}),
		currentIcrcPrices: buildPriceMap({
			pairs: icrc.pairs,
			rates: coingeckoRates,
			normalizeId: lower
		}),
		currentSplPrices: buildPriceMap({ pairs: spl.pairs, rates: coingeckoRates })
	};
};

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) => {
	if (nonNullish(data)) {
		exchangeStore.set(
			[
				data.currentEthPrice,
				data.currentBtcPrice,
				data.currentIcpPrice,
				data.currentSolPrice,
				data.currentBnbPrice,
				data.currentPolPrice,
				data.currentArbitrumEthPrice,
				data.currentBaseEthPrice,
				data.currentErc20Prices,
				data.currentIcrcPrices,
				data.currentSplPrices,
				data.currentErc4626Prices
			].filter(nonNullish)
		);

		if (nonNullish(data.currentExchangeRate)) {
			// We set the reference currency for the exchange rate to avoid possible race condition where the user changes the current currency while the value is being uploaded, leading to inconsistent data in the UI.
			currencyExchangeStore.setExchangeRateCurrency(data.currentExchangeRate.currency);
			currencyExchangeStore.setExchangeRate(data.currentExchangeRate.exchangeRateToUsd);
			currencyExchangeStore.setExchangeRate24hChangeMultiplier(
				data.currentExchangeRate.exchangeRate24hChangeMultiplier
			);
		}
	}
};
