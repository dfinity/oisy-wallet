import type { CustomTokenId, ExchangeRate } from '$declarations/backend/backend.did';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getExchangeRates } from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { simplePrice } from '$lib/rest/coingecko.rest';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';

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

export const toCustomTokenId = (token: {
	address: string;
	coingeckoId?: string;
	standard?: string;
	chain_id?: bigint;
}): CustomTokenId | undefined => {
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
		return { Ethereum: [token.address, chainId] };
	}

	return undefined;
};

const mapExchangeRateToCoingecko = (
	rate: [] | [ExchangeRate]
): { usd: number; usd_24h_change?: number; usd_market_cap: number } | undefined => {
	const r = rate.length > 0 ? rate[0] : undefined;
	if (isNullish(r)) {
		return undefined;
	}
	const change = r.usd.price_24h_change_pct.length > 0 ? r.usd.price_24h_change_pct[0] : undefined;
	return {
		usd: r.usd.price,
		usd_24h_change: change,
		usd_market_cap: r.usd.market_cap
	};
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
	currentErc20Prices: CoingeckoSimpleTokenPriceResponse;
	currentIcrcPrices: CoingeckoSimpleTokenPriceResponse;
	currentSplPrices: CoingeckoSimpleTokenPriceResponse;
}> => {
	const tokenIds: CustomTokenId[] = [];

	// Map ERC20
	const erc20TokenIds = erc20Addresses
		.map((t) => toCustomTokenId({ address: t.address, coingeckoId: t.coingeckoId }))
		.filter(nonNullish);
	tokenIds.push(...erc20TokenIds);

	// Map ICRC
	const icrcTokenIds = icrcCanisterIds.map((id) => ({ Icrc: Principal.fromText(id) }));
	tokenIds.push(...icrcTokenIds);

	// Map SPL
	const splIds = splTokenAddresses.map((addr) => ({ SolMainnet: addr }) as CustomTokenId);
	tokenIds.push(...splIds);

	const response = await getExchangeRates({
		token_ids: tokenIds,
		certified: false,
		identity: undefined // Anonymous
	});

	const findRate = (
		id: CustomTokenId
	): { usd: number; usd_24h_change?: number; usd_market_cap: number } | undefined => {
		const match = response.find(([tokenId]) => JSON.stringify(tokenId) === JSON.stringify(id));
		return match ? mapExchangeRateToCoingecko(match[1]) : undefined;
	};



	const erc20Prices: CoingeckoSimpleTokenPriceResponse = {};
	erc20Addresses.forEach((t) => {
		const id = toCustomTokenId({ address: t.address, coingeckoId: t.coingeckoId });
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
		const rate = findRate({ SolMainnet: addr } as CustomTokenId);
		if (nonNullish(rate)) {
			splPrices[addr.toLowerCase()] = rate;
		}
	});

	return {
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
