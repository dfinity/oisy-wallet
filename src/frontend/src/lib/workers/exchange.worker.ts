import { calculateErc4626Prices } from '$eth/services/erc4626-exchange.services';
import type { Erc4626TokensExchangeData } from '$eth/types/erc4626';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import { Currency } from '$lib/enums/currency';
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
	exchangeRateUsdToCurrency
} from '$lib/services/exchange.services';
import type { CoingeckoPlatformId } from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange
} from '$lib/types/post-message';
import { errorDetailToString } from '$lib/utils/error.utils';
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

const startExchangeTimer = async (data: PostMessageDataRequestExchangeTimer | undefined) => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	const sync = async () =>
		await syncExchange({
			currentCurrency: data?.currentCurrency ?? Currency.USD,
			erc20ContractAddresses: data?.erc20Addresses ?? [],
			icrcLedgerCanisterIds: data?.icrcCanisterIds ?? [],
			splTokenAddresses: data?.splAddresses ?? [],
			erc4626TokensExchangeData: data?.erc4626TokensExchangeData ?? []
		});

	// We sync now but also schedule the update afterward
	await sync();

	const scheduleNext = (): void => {
		timer = setTimeout(async () => {
			await sync();

			if (nonNullish(timer)) {
				scheduleNext();
			}
		}, SYNC_EXCHANGE_TIMER_INTERVAL);
	};

	scheduleNext();
};

const stopTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearTimeout(timer);
	timer = undefined;
};

let syncInProgress = false;

const syncExchange = async ({
	currentCurrency,
	erc20ContractAddresses,
	icrcLedgerCanisterIds,
	splTokenAddresses,
	erc4626TokensExchangeData
}: {
	currentCurrency: Currency;
	erc20ContractAddresses: Erc20ContractAddressWithNetwork[];
	icrcLedgerCanisterIds: LedgerCanisterIdText[];
	splTokenAddresses: SplTokenAddress[];
	erc4626TokensExchangeData: Erc4626TokensExchangeData[];
}) => {
	// Avoid duplicating the sync if already in progress and not yet finished
	if (syncInProgress) {
		return;
	}

	syncInProgress = true;

	const erc20PriceParams: CoingeckoErc20PriceParams[] = Object.values(
		erc20ContractAddresses.reduce<Record<CoingeckoPlatformId, CoingeckoErc20PriceParams>>(
			(acc, { address, coingeckoId }) => {
				if (
					coingeckoId !== 'ethereum' &&
					coingeckoId !== 'base' &&
					coingeckoId !== 'binance-smart-chain' &&
					coingeckoId !== 'polygon-pos' &&
					coingeckoId !== 'arbitrum-one'
				) {
					return acc;
				}

				return {
					...acc,
					[coingeckoId]: {
						coingeckoPlatformId: coingeckoId,
						contractAddresses: [
							...(acc[coingeckoId]?.contractAddresses ?? []),
							{ address, coingeckoId }
						]
					}
				};
			},
			{} as Record<CoingeckoPlatformId, CoingeckoErc20PriceParams>
		)
	);

	try {
		const erc20Prices = await Promise.all(
			erc20PriceParams.map((params) => exchangeRateERC20ToUsd(params))
		);

		const [
			currentExchangeRate,
			currentEthPrice,
			currentBtcPrice,
			currentErc20Prices,
			currentIcpPrice,
			currentIcrcPrices,
			currentSolPrice,
			currentSplPrices,
			currentBnbPrice,
			currentPolPrice
		] = await Promise.all([
			exchangeRateUsdToCurrency(currentCurrency),
			exchangeRateETHToUsd(),
			exchangeRateBTCToUsd(),
			erc20Prices.reduce((acc, prices) => ({ ...acc, ...prices }), {}),
			exchangeRateICPToUsd(),
			exchangeRateICRCToUsd(icrcLedgerCanisterIds),
			exchangeRateSOLToUsd(),
			exchangeRateSPLToUsd(splTokenAddresses),
			exchangeRateBNBToUsd(),
			exchangeRatePOLToUsd()
		]);

		const currentErc4626Prices = await calculateErc4626Prices({
			erc20Prices: currentErc20Prices,
			erc4626TokensExchangeData
		});

		postMessage({
			msg: 'syncExchange',
			data: {
				currentExchangeRate: {
					exchangeRateToUsd: currentExchangeRate?.rate,
					exchangeRate24hChangeMultiplier: currentExchangeRate?.fx24hChangeMultiplier,
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
				currentPolPrice
			}
		} as PostMessage<PostMessageDataResponseExchange>);
	} catch (err: unknown) {
		console.error('Unexpected error while fetching symbol average price:', err);
		stopTimer();

		postMessage({
			msg: 'syncExchangeError',
			data: {
				err: errorDetailToString(err)
			}
		});
	}

	syncInProgress = false;
};
