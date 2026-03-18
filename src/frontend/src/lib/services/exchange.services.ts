import type { ExchangeRate, TokenId } from '$declarations/backend/backend.did';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getExchangeRates } from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
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

export const toTokenId = (token: {
	address: string;
	coingeckoId?: string;
	standard?: string;
	chain_id?: bigint;
}): TokenId | undefined => {
	if (token.standard === 'icrc') {
		return { Icrc: Principal.fromText(token.address) };
	}

	const chainId =
		token.chain_id ??
		(token.coingeckoId === 'ethereum'
			? 1n
			: token.coingeckoId === 'binance-smart-chain'
				? 56n
				: token.coingeckoId === 'polygon-pos'
					? 137n
					: token.coingeckoId === 'base'
						? 8453n
						: token.coingeckoId === 'arbitrum-one'
							? 42161n
							: undefined);

	if (nonNullish(chainId)) {
		return { Erc20: [token.address, chainId] };
	}

	return undefined;
};

const mapExchangeRateToCoingecko = (
	rate: ExchangeRate | undefined
): { usd: number; usd_24h_change?: number; usd_market_cap: number } | undefined => {
	if (isNullish(rate)) {
		return;
	}

	const price = rate.usd.price[0];

	if (isNullish(price)) {
		return;
	}

	return {
		usd: price,
		usd_24h_change: rate.usd.price_24h_change_pct[0],
		usd_market_cap: rate.usd.market_cap[0] ?? 0
	};
};

const NATIVE_TOKEN_IDS: { tokenId: TokenId; coingeckoKey: string }[] = [
	{ tokenId: { EvmNative: 1n }, coingeckoKey: 'ethereum' },
	{ tokenId: { BtcNativeMainnet: null }, coingeckoKey: 'bitcoin' },
	{ tokenId: { IcpNative: null }, coingeckoKey: 'internet-computer' },
	{ tokenId: { SolNativeMainnet: null }, coingeckoKey: 'solana' },
	{ tokenId: { EvmNative: 56n }, coingeckoKey: 'binancecoin' },
	{ tokenId: { EvmNative: 137n }, coingeckoKey: 'polygon-ecosystem-token' }
];

const tokenIdKey = (id: TokenId): string => {
	if ('Icrc' in id) {
		return `Icrc:${id.Icrc.toText()}`;
	}
	if ('Erc20' in id) {
		return `Erc20:${id.Erc20[0].toLowerCase()}:${id.Erc20[1]}`;
	}
	if ('SplMainnet' in id) {
		return `SplMainnet:${id.SplMainnet.toLowerCase()}`;
	}
	if ('EvmNative' in id) {
		return `EvmNative:${id.EvmNative}`;
	}
	if ('BtcNativeMainnet' in id) {
		return 'BtcNativeMainnet';
	}
	if ('IcpNative' in id) {
		return 'IcpNative';
	}
	if ('SolNativeMainnet' in id) {
		return 'SolNativeMainnet';
	}
	return `unknown:${Object.keys(id)[0]}`;
};

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

	const erc20TokenIds = erc20Addresses
		.map((t) => toTokenId({ address: t.address, coingeckoId: t.coingeckoId }))
		.filter(nonNullish);
	tokenIds.push(...erc20TokenIds);

	const icrcTokenIds = icrcCanisterIds.map((id) => ({ Icrc: Principal.fromText(id) }));
	tokenIds.push(...icrcTokenIds);

	const splIds: TokenId[] = splTokenAddresses.map((addr) => ({ SplMainnet: addr }));
	tokenIds.push(...splIds);

	const response = await getExchangeRates({
		token_ids: tokenIds,
		certified: false,
		identity: undefined
	});

	const ratesByKey = new Map(response.map(([id, rate]) => [tokenIdKey(id), rate]));

	const findRate = (
		id: TokenId
	): { usd: number; usd_24h_change?: number; usd_market_cap: number } | undefined =>
		mapExchangeRateToCoingecko(ratesByKey.get(tokenIdKey(id)));

	const nativePrice = (
		entry: (typeof NATIVE_TOKEN_IDS)[number]
	): CoingeckoSimplePriceResponse | undefined => {
		const rate = findRate(entry.tokenId);

		return nonNullish(rate) ? { [entry.coingeckoKey]: rate } : undefined;
	};

	const [ethEntry, btcEntry, icpEntry, solEntry, bnbEntry, polEntry] = NATIVE_TOKEN_IDS;

	const erc20Prices: CoingeckoSimpleTokenPriceResponse = {};
	erc20Addresses.forEach((t) => {
		const id = toTokenId({ address: t.address, coingeckoId: t.coingeckoId });
		if (nonNullish(id)) {
			const rate = findRate(id);
			if (nonNullish(rate)) {
				erc20Prices[t.address.toLowerCase()] = rate;
			}
		}
	});

	const icrcPrices: CoingeckoSimpleTokenPriceResponse = {};
	icrcCanisterIds.forEach((id) => {
		const rate = findRate({ Icrc: Principal.fromText(id) });
		if (nonNullish(rate)) {
			icrcPrices[id.toLowerCase()] = rate;
		}
	});

	const splPrices: CoingeckoSimpleTokenPriceResponse = {};
	splTokenAddresses.forEach((addr) => {
		const rate = findRate({ SplMainnet: addr });
		if (nonNullish(rate)) {
			splPrices[addr.toLowerCase()] = rate;
		}
	});

	return {
		currentEthPrice: nativePrice(ethEntry),
		currentBtcPrice: nativePrice(btcEntry),
		currentIcpPrice: nativePrice(icpEntry),
		currentSolPrice: nativePrice(solEntry),
		currentBnbPrice: nativePrice(bnbEntry),
		currentPolPrice: nativePrice(polEntry),
		currentErc20Prices: erc20Prices,
		currentIcrcPrices: icrcPrices,
		currentSplPrices: splPrices
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
