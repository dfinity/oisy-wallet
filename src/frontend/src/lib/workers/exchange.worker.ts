import { BACKEND_EXCHANGE_ENABLED } from '$env/exchange.env';
import { COINGECKO_FALLBACK_PROVIDER_ENABLED } from '$env/rest/coingecko.env';
import { calculateErc4626Prices } from '$eth/services/erc4626-exchange.services';
import type { Erc4626TokensExchangeData } from '$eth/types/erc4626';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getSyncExchangeTimerInterval } from '$lib/constants/exchange.constants';
import { Currency } from '$lib/enums/currency';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	exchangeRateBNBToUsd,
	exchangeRateBTCToUsd,
	exchangeRateERC20ToUsd,
	exchangeRateETHToUsd,
	exchangeRateICPToUsd,
	exchangeRateICRCToUsd,
	exchangeRatePOLToUsd,
	exchangeRateSOLToUsd,
	exchangeRateSPLToUsd,
	exchangeRateUsdToCurrency,
	fetchExchangeRatesFromBackend,
	fillIcrcPricesFromFallbackProviders
} from '$lib/services/exchange.services';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange
} from '$lib/types/post-message';
import { consoleError } from '$lib/utils/console.utils';
import { errorDetailToString } from '$lib/utils/error.utils';
import {
	buildErc20PriceParams,
	findMissingErc20ContractAddresses,
	findMissingLedgerCanisterIds,
	findMissingSplTokenAddresses,
	mergeExchangePrices,
	type ProviderFallbackPrices
} from '$lib/utils/exchange.utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';

export const onExchangeMessage = async ({
	data
}: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>>) => {
	const { msg, data: payload } = data;

	switch (msg) {
		case 'stopExchangeTimer':
			stopTimer();
			return;
		case 'startExchangeTimer':
			await startExchangeTimer(payload);
	}
};

let timer: NodeJS.Timeout | undefined = undefined;
let timerGeneration = 0;
let latestTimerData: PostMessageDataRequestExchangeTimer | undefined = undefined;

const startExchangeTimer = async (data: PostMessageDataRequestExchangeTimer | undefined) => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	if (syncInProgress && activeSyncGeneration === timerGeneration) {
		return;
	}

	latestTimerData = data;
	const generation = ++timerGeneration;

	// We sync now but also schedule the update afterward
	await syncLatestExchange(generation);

	if (generation !== timerGeneration) {
		return;
	}

	const scheduleNext = (): void => {
		timer = setTimeout(
			async () => {
				await syncLatestExchange(generation);

				if (generation === timerGeneration) {
					scheduleNext();
				}
			},
			getSyncExchangeTimerInterval(backendExchangeEnabledFromTimerData(latestTimerData))
		);
	};

	scheduleNext();
};

const stopTimer = () => {
	timerGeneration++;

	if (isNullish(timer)) {
		return;
	}

	clearTimeout(timer);
	timer = undefined;
};

let syncInProgress = false;
let queuedSyncGeneration: number | undefined = undefined;
let activeSyncGeneration: number | undefined = undefined;

interface SyncExchangeParams {
	currentCurrency: Currency;
	erc20ContractAddresses: Erc20ContractAddressWithNetwork[];
	icrcLedgerCanisterIds: LedgerCanisterIdText[];
	splTokenAddresses: SplTokenAddress[];
	erc4626TokensExchangeData: Erc4626TokensExchangeData[];
}

const syncExchangeFromBackend = async ({
	currentCurrency,
	erc4626TokensExchangeData
}: SyncExchangeParams): Promise<PostMessageDataResponseExchange> => {
	const identity = await AuthClientProvider.getInstance().loadIdentity();

	if (isNullish(identity)) {
		consoleError(
			'Error while fetching exchange rate:',
			'Cannot fetch backend exchange rates without an authenticated identity.'
		);

		return {
			currentExchangeRate: {
				exchangeRateToUsd: null,
				exchangeRate24hChangeMultiplier: null,
				currency: currentCurrency
			},
			currentEthPrice: undefined,
			currentBtcPrice: undefined,
			currentErc20Prices: {},
			currentIcpPrice: undefined,
			currentIcrcPrices: {},
			currentSolPrice: undefined,
			currentSplPrices: {},
			currentErc4626Prices: {},
			currentBnbPrice: undefined,
			currentPolPrice: undefined
		};
	}

	const [currentExchangeRateResult, backendPricesResult] = await Promise.allSettled([
		exchangeRateUsdToCurrency(currentCurrency),
		fetchExchangeRatesFromBackend({ identity })
	]);

	if (currentExchangeRateResult.status === 'rejected') {
		consoleError('Error while fetching exchange rate:', currentExchangeRateResult.reason);
	}

	if (backendPricesResult.status === 'rejected') {
		consoleError(
			'Error while fetching exchange rate:',
			'Failed to fetch backend exchange rates:',
			backendPricesResult.reason
		);
	}

	const currentExchangeRate =
		currentExchangeRateResult.status === 'fulfilled' ? currentExchangeRateResult.value : undefined;

	const {
		currentEthPrice,
		currentBtcPrice,
		currentIcpPrice,
		currentSolPrice,
		currentBnbPrice,
		currentPolPrice,
		currentArbitrumEthPrice,
		currentBaseEthPrice,
		currentErc20Prices,
		currentIcrcPrices,
		currentSplPrices
	} =
		backendPricesResult.status === 'fulfilled'
			? backendPricesResult.value
			: {
					currentEthPrice: undefined,
					currentBtcPrice: undefined,
					currentIcpPrice: undefined,
					currentSolPrice: undefined,
					currentBnbPrice: undefined,
					currentPolPrice: undefined,
					currentArbitrumEthPrice: undefined,
					currentBaseEthPrice: undefined,
					currentErc20Prices: {},
					currentIcrcPrices: {},
					currentSplPrices: {}
				};

	const currentErc4626Prices = await calculateErc4626Prices({
		erc20Prices: currentErc20Prices,
		erc4626TokensExchangeData
	});

	return {
		currentExchangeRate: {
			exchangeRateToUsd: currentExchangeRate?.rate ?? null,
			exchangeRate24hChangeMultiplier: currentExchangeRate?.fx24hChangeMultiplier ?? null,
			currency: currentCurrency
		},
		currentEthPrice,
		currentBtcPrice,
		currentErc20Prices,
		currentIcpPrice,
		currentIcrcPrices,
		currentSolPrice,
		currentSplPrices,
		currentErc4626Prices,
		currentBnbPrice,
		currentPolPrice,
		currentArbitrumEthPrice,
		currentBaseEthPrice
	};
};

const syncExchangeFromProviders = async ({
	currentCurrency,
	erc20ContractAddresses,
	icrcLedgerCanisterIds,
	splTokenAddresses,
	erc4626TokensExchangeData
}: SyncExchangeParams): Promise<PostMessageDataResponseExchange> => {
	const erc20PriceParams = buildErc20PriceParams(erc20ContractAddresses);

	const erc20PricesSettled = await Promise.allSettled(
		erc20PriceParams.map((params) => exchangeRateERC20ToUsd(params))
	);

	const currentErc20Prices = erc20PricesSettled.reduce<CoingeckoSimpleTokenPriceResponse>(
		(acc, result) => {
			if (result.status === 'fulfilled' && nonNullish(result.value)) {
				Object.assign(acc, result.value);
			}
			return acc;
		},
		{}
	);

	const results = await Promise.allSettled([
		exchangeRateUsdToCurrency(currentCurrency),
		exchangeRateETHToUsd(),
		exchangeRateBTCToUsd(),
		exchangeRateICPToUsd(),
		exchangeRateICRCToUsd(icrcLedgerCanisterIds),
		exchangeRateSOLToUsd(),
		exchangeRateSPLToUsd(splTokenAddresses),
		exchangeRateBNBToUsd(),
		exchangeRatePOLToUsd()
	]);

	results.forEach((result) => {
		if (result.status === 'rejected') {
			consoleError('Error while fetching exchange rate:', result.reason);
		}
	});

	const [
		currentExchangeRateResult,
		currentEthPriceResult,
		currentBtcPriceResult,
		currentIcpPriceResult,
		currentIcrcPricesResult,
		currentSolPriceResult,
		currentSplPricesResult,
		currentBnbPriceResult,
		currentPolPriceResult
	] = results;

	const currentExchangeRate =
		currentExchangeRateResult.status === 'fulfilled' ? currentExchangeRateResult.value : undefined;
	const currentEthPrice =
		currentEthPriceResult.status === 'fulfilled' ? currentEthPriceResult.value : undefined;
	const currentBtcPrice =
		currentBtcPriceResult.status === 'fulfilled' ? currentBtcPriceResult.value : undefined;
	const currentIcpPrice =
		currentIcpPriceResult.status === 'fulfilled' ? currentIcpPriceResult.value : undefined;
	const currentIcrcPrices =
		currentIcrcPricesResult.status === 'fulfilled' ? currentIcrcPricesResult.value : undefined;
	const currentSolPrice =
		currentSolPriceResult.status === 'fulfilled' ? currentSolPriceResult.value : undefined;
	const currentSplPrices =
		currentSplPricesResult.status === 'fulfilled' ? currentSplPricesResult.value : undefined;
	const currentBnbPrice =
		currentBnbPriceResult.status === 'fulfilled' ? currentBnbPriceResult.value : undefined;
	const currentPolPrice =
		currentPolPriceResult.status === 'fulfilled' ? currentPolPriceResult.value : undefined;

	const currentErc4626Prices = await calculateErc4626Prices({
		erc20Prices: currentErc20Prices,
		erc4626TokensExchangeData
	});

	return {
		currentExchangeRate: {
			exchangeRateToUsd: currentExchangeRate?.rate ?? null,
			exchangeRate24hChangeMultiplier: currentExchangeRate?.fx24hChangeMultiplier ?? null,
			currency: currentCurrency
		},
		currentEthPrice,
		currentBtcPrice,
		currentErc20Prices,
		currentIcpPrice,
		currentIcrcPrices: currentIcrcPrices ?? {},
		currentSolPrice,
		currentSplPrices: currentSplPrices ?? {},
		currentErc4626Prices,
		currentBnbPrice,
		currentPolPrice,
		currentArbitrumEthPrice: currentEthPrice,
		currentBaseEthPrice: currentEthPrice
	};
};

const settledValue = <T>(result: PromiseSettledResult<T>): T | undefined =>
	result.status === 'fulfilled' ? result.value : undefined;

// Native ETH on Arbitrum and Base reuses the Ethereum spot price (matching the
// providers path), so all three share the single `exchangeRateETHToUsd` call.
const fetchProviderFallbackPrices = async ({
	backendData,
	params
}: {
	backendData: PostMessageDataResponseExchange;
	params: SyncExchangeParams;
}): Promise<ProviderFallbackPrices | undefined> => {
	const missingErc20 = findMissingErc20ContractAddresses({
		allErc20ContractAddresses: params.erc20ContractAddresses,
		coingeckoResponse: backendData.currentErc20Prices
	});
	const missingIcrc = findMissingLedgerCanisterIds({
		allLedgerCanisterIds: params.icrcLedgerCanisterIds,
		coingeckoResponse: backendData.currentIcrcPrices
	});
	const missingSpl = findMissingSplTokenAddresses({
		allSplTokenAddresses: params.splTokenAddresses,
		coingeckoResponse: backendData.currentSplPrices ?? {}
	});

	const missingEth = isNullish(backendData.currentEthPrice);
	const missingBtc = isNullish(backendData.currentBtcPrice);
	const missingIcp = isNullish(backendData.currentIcpPrice);
	const missingSol = isNullish(backendData.currentSolPrice);
	const missingBnb = isNullish(backendData.currentBnbPrice);
	const missingPol = isNullish(backendData.currentPolPrice);
	const missingArbitrumEth = isNullish(backendData.currentArbitrumEthPrice);
	const missingBaseEth = isNullish(backendData.currentBaseEthPrice);
	// ETH, Arbitrum-ETH and Base-ETH all resolve to the same Ethereum spot price,
	// so a single CoinGecko call covers whichever of the three are missing.
	const needsEth = missingEth || missingArbitrumEth || missingBaseEth;

	// Natives, ERC-20 and SPL fills are CoinGecko-only: when the fallback flag is
	// off they are skipped entirely (the tokens stay unpriced) and only the
	// ICPSwap/Kong ICRC cascade runs.
	const erc20PriceParams = COINGECKO_FALLBACK_PROVIDER_ENABLED
		? buildErc20PriceParams(missingErc20)
		: [];
	const splToFill = COINGECKO_FALLBACK_PROVIDER_ENABLED ? missingSpl : [];
	const fillEth = COINGECKO_FALLBACK_PROVIDER_ENABLED && needsEth;
	const fillBtc = COINGECKO_FALLBACK_PROVIDER_ENABLED && missingBtc;
	const fillIcp = COINGECKO_FALLBACK_PROVIDER_ENABLED && missingIcp;
	const fillSol = COINGECKO_FALLBACK_PROVIDER_ENABLED && missingSol;
	const fillBnb = COINGECKO_FALLBACK_PROVIDER_ENABLED && missingBnb;
	const fillPol = COINGECKO_FALLBACK_PROVIDER_ENABLED && missingPol;

	const nothingMissing =
		erc20PriceParams.length === 0 &&
		missingIcrc.length === 0 &&
		splToFill.length === 0 &&
		!fillEth &&
		!fillBtc &&
		!fillIcp &&
		!fillSol &&
		!fillBnb &&
		!fillPol;

	if (nothingMissing) {
		return undefined;
	}

	// Failures in the fill are non-fatal (the merged response simply keeps the
	// backend's gaps), but they must stay observable — mirror the logging of the
	// full provider path.
	const logFallbackError = (err: unknown): undefined => {
		consoleError('Error while fetching fallback exchange rate:', err);
		return undefined;
	};

	const erc20PricesPromise = Promise.allSettled(
		erc20PriceParams.map((priceParams) => exchangeRateERC20ToUsd(priceParams))
	);

	const [
		erc20PricesSettled,
		icrcPricesResult,
		splPricesResult,
		ethPriceResult,
		btcPriceResult,
		icpPriceResult,
		solPriceResult,
		bnbPriceResult,
		polPriceResult
	] = await Promise.all([
		erc20PricesPromise,
		missingIcrc.length > 0
			? (COINGECKO_FALLBACK_PROVIDER_ENABLED
					? exchangeRateICRCToUsd(missingIcrc)
					: fillIcrcPricesFromFallbackProviders({ ledgerCanisterIds: missingIcrc })
				).catch(logFallbackError)
			: Promise.resolve(undefined),
		splToFill.length > 0
			? exchangeRateSPLToUsd(splToFill).catch(logFallbackError)
			: Promise.resolve(undefined),
		fillEth ? exchangeRateETHToUsd().catch(logFallbackError) : Promise.resolve(undefined),
		fillBtc ? exchangeRateBTCToUsd().catch(logFallbackError) : Promise.resolve(undefined),
		fillIcp ? exchangeRateICPToUsd().catch(logFallbackError) : Promise.resolve(undefined),
		fillSol ? exchangeRateSOLToUsd().catch(logFallbackError) : Promise.resolve(undefined),
		fillBnb ? exchangeRateBNBToUsd().catch(logFallbackError) : Promise.resolve(undefined),
		fillPol ? exchangeRatePOLToUsd().catch(logFallbackError) : Promise.resolve(undefined)
	]);

	const erc20Prices =
		erc20PriceParams.length > 0
			? erc20PricesSettled.reduce<CoingeckoSimpleTokenPriceResponse>((acc, result) => {
					if (result.status === 'rejected') {
						logFallbackError(result.reason);
						return acc;
					}
					const value = settledValue(result);
					if (nonNullish(value)) {
						Object.assign(acc, value);
					}
					return acc;
				}, {})
			: undefined;

	const ethPrice: CoingeckoSimplePriceResponse | undefined = ethPriceResult ?? undefined;

	return {
		erc20Prices,
		icrcPrices: icrcPricesResult,
		splPrices: splPricesResult,
		ethPrice: missingEth ? ethPrice : undefined,
		btcPrice: btcPriceResult,
		icpPrice: icpPriceResult,
		solPrice: solPriceResult,
		bnbPrice: bnbPriceResult,
		polPrice: polPriceResult,
		arbitrumEthPrice: missingArbitrumEth ? ethPrice : undefined,
		baseEthPrice: missingBaseEth ? ethPrice : undefined
	};
};

const syncExchangeWithFallback = async (
	params: SyncExchangeParams
): Promise<PostMessageDataResponseExchange> => {
	const backendData = await syncExchangeFromBackend(params);

	const providerPrices = await fetchProviderFallbackPrices({ backendData, params });

	if (isNullish(providerPrices)) {
		return backendData;
	}

	return await mergeExchangePrices({
		backendData,
		providerPrices,
		erc4626Prices: (mergedErc20Prices) =>
			calculateErc4626Prices({
				erc20Prices: mergedErc20Prices,
				erc4626TokensExchangeData: params.erc4626TokensExchangeData
			})
	});
};

const paramsFromTimerData = (
	data: PostMessageDataRequestExchangeTimer | undefined
): SyncExchangeParams => ({
	currentCurrency: data?.currentCurrency ?? Currency.USD,
	erc20ContractAddresses: data?.erc20Addresses ?? [],
	icrcLedgerCanisterIds: data?.icrcCanisterIds ?? [],
	splTokenAddresses: data?.splAddresses ?? [],
	erc4626TokensExchangeData: data?.erc4626TokensExchangeData ?? []
});

const backendExchangeEnabledFromTimerData = (
	data: PostMessageDataRequestExchangeTimer | undefined
): boolean => data?.backendExchangeEnabled ?? BACKEND_EXCHANGE_ENABLED;

const syncLatestExchange = async (generation: number) => {
	if (generation !== timerGeneration) {
		return;
	}

	if (syncInProgress) {
		queuedSyncGeneration = generation;
		return;
	}

	syncInProgress = true;
	activeSyncGeneration = generation;

	await syncExchange(paramsFromTimerData(latestTimerData)).finally(() => {
		syncInProgress = false;
		if (activeSyncGeneration === generation) {
			activeSyncGeneration = undefined;
		}
	});

	const nextGeneration = queuedSyncGeneration;
	queuedSyncGeneration = undefined;

	if (
		nonNullish(nextGeneration) &&
		nextGeneration !== generation &&
		nextGeneration === timerGeneration
	) {
		void syncLatestExchange(nextGeneration);
	}
};

const syncExchange = async (params: SyncExchangeParams) => {
	try {
		const data = backendExchangeEnabledFromTimerData(latestTimerData)
			? await syncExchangeWithFallback(params)
			: await syncExchangeFromProviders(params);

		postMessage({
			msg: 'syncExchange',
			data
		});
	} catch (err: unknown) {
		consoleError('Unexpected error while fetching symbol average price:', err);

		postMessage({
			msg: 'syncExchangeError',
			data: {
				err: errorDetailToString(err)
			}
		});
	}
};
