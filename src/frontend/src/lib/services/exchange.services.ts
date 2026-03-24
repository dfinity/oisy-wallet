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

const fetchIcrcPricesFromCoingecko = (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
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

export const exchangeRateETHToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'internet-computer',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'solana',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRatePOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'polygon-ecosystem-token',
		vs_currencies: Currency.USD,
		include_24hr_change: true
	});

export const exchangeRateERC20ToUsd = async ({
	coingeckoPlatformId: id,
	contractAddresses
}: CoingeckoErc20PriceParams): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (contractAddresses.length === 0) {
		return null;
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
): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (ledgerCanisterIds.length === 0) {
		return null;
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
		...(coingeckoPrices ?? {}),
		...(kongSwapPrices ?? {})
	};
};

export const exchangeRateSPLToUsd = async (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (tokenAddresses.length === 0) {
		return null;
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

const NATIVE_TOKEN_IDS: { tokenId: TokenId; coingeckoKey: CoingeckoCoinsId }[] = [
	{ tokenId: { EvmNative: ETHEREUM_NETWORK.chainId }, coingeckoKey: 'ethereum' },
	{ tokenId: { BtcNativeMainnet: null }, coingeckoKey: 'bitcoin' },
	{ tokenId: { IcpNative: null }, coingeckoKey: 'internet-computer' },
	{ tokenId: { SolNativeMainnet: null }, coingeckoKey: 'solana' },
	{ tokenId: { EvmNative: BSC_MAINNET_NETWORK.chainId }, coingeckoKey: 'binancecoin' },
	{
		tokenId: { EvmNative: POLYGON_MAINNET_NETWORK.chainId },
		coingeckoKey: 'polygon-ecosystem-token'
	},
	{ tokenId: { EvmNative: BASE_NETWORK.chainId }, coingeckoKey: 'ethereum' },
	{ tokenId: { EvmNative: ARBITRUM_MAINNET_NETWORK.chainId }, coingeckoKey: 'ethereum' }
];

export const fetchAllExchangeRatesFromBackend = async ({
	erc20Addresses,
	icrcCanisterIds,
	splTokenAddresses
}: {
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
	currentErc20Prices: CoingeckoSimpleTokenPriceResponse;
	currentIcrcPrices: CoingeckoSimpleTokenPriceResponse;
	currentSplPrices: CoingeckoSimpleTokenPriceResponse;
}> => {
	const tokenIds: TokenId[] = NATIVE_TOKEN_IDS.map(({ tokenId }) => tokenId);

	const erc20TokenPairs = erc20Addresses.reduce<
		{ address: Erc20ContractAddressWithNetwork['address']; key: string }[]
	>((acc, t) => {
		const tokenId: TokenId = { Erc20: [t.address, t.chainId] };

		const key = tokenIdKey(tokenId);

		if (isNullish(key)) {
			return acc;
		}

		tokenIds.push(tokenId);

		acc.push({ address: t.address, key });

		return acc;
	}, []);

	const icrcTokenPairs = icrcCanisterIds.reduce<{ id: string; key: string }[]>((acc, id) => {
		const tokenId: TokenId = { Icrc: Principal.fromText(id) };
		const key = tokenIdKey(tokenId);
		if (isNullish(key)) {
			return acc;
		}
		tokenIds.push(tokenId);
		return [...acc, { id, key }];
	}, []);

	const splTokenPairs = splTokenAddresses.reduce<{ addr: string; key: string }[]>((acc, addr) => {
		const tokenId: TokenId = { SplMainnet: addr };
		const key = tokenIdKey(tokenId);
		if (isNullish(key)) {
			return acc;
		}
		tokenIds.push(tokenId);
		return [...acc, { addr, key }];
	}, []);

	const ratesByKey = await getExchangeRates({
		token_ids: tokenIds,
		certified: false,
		identity: undefined
	});

	const coingeckoRates = new Map<string, CoingeckoSimpleTokenPrice>();
	for (const [key, rate] of ratesByKey) {
		const mapped = mapExchangeRateToCoingecko(rate);
		if (nonNullish(mapped)) {
			coingeckoRates.set(key, mapped);
		}
	}

	const nativePrice = ({
		tokenId,
		coingeckoKey
	}: (typeof NATIVE_TOKEN_IDS)[number]): CoingeckoSimplePriceResponse | undefined => {
		const key = tokenIdKey(tokenId);
		const rate = nonNullish(key) ? coingeckoRates.get(key) : undefined;
		return nonNullish(rate) ? { [coingeckoKey]: rate } : undefined;
	};

	const [ethEntry, btcEntry, icpEntry, solEntry, bnbEntry, polEntry] = NATIVE_TOKEN_IDS;

	const currentErc20Prices = erc20TokenPairs.reduce<CoingeckoSimpleTokenPriceResponse>(
		(acc, { address, key }) => {
			const rate = coingeckoRates.get(key);
			return nonNullish(rate) ? { ...acc, [address.toLowerCase()]: rate } : acc;
		},
		{}
	);

	const currentIcrcPrices = icrcTokenPairs.reduce<CoingeckoSimpleTokenPriceResponse>(
		(acc, { id, key }) => {
			const rate = coingeckoRates.get(key);
			return nonNullish(rate) ? { ...acc, [id.toLowerCase()]: rate } : acc;
		},
		{}
	);

	const currentSplPrices = splTokenPairs.reduce<CoingeckoSimpleTokenPriceResponse>(
		(acc, { addr, key }) => {
			const rate = coingeckoRates.get(key);
			return nonNullish(rate) ? { ...acc, [addr]: rate } : acc;
		},
		{}
	);

	return {
		currentEthPrice: nativePrice(ethEntry),
		currentBtcPrice: nativePrice(btcEntry),
		currentIcpPrice: nativePrice(icpEntry),
		currentSolPrice: nativePrice(solEntry),
		currentBnbPrice: nativePrice(bnbEntry),
		currentPolPrice: nativePrice(polEntry),
		currentErc20Prices,
		currentIcrcPrices,
		currentSplPrices
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
