import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import {
	exchangeRateBNBToUsd,
	exchangeRateBTCToUsd,
	exchangeRateERC20ToUsd,
	exchangeRateETHToUsd,
	exchangeRateICPToUsd,
	exchangeRateICRCToUsd,
	exchangeRateSOLToUsd,
	exchangeRateSPLToUsd
} from '$lib/services/exchange.services';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
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
			return;
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
			erc20ContractAddresses: data?.erc20Addresses ?? [],
			icrcLedgerCanisterIds: data?.icrcCanisterIds ?? [],
			splTokenAddresses: data?.splAddresses ?? []
		});

	// We sync now but also schedule the update afterwards
	await sync();

	timer = setInterval(sync, SYNC_EXCHANGE_TIMER_INTERVAL);
};

const stopTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};

let syncInProgress = false;

const syncExchange = async ({
	erc20ContractAddresses,
	icrcLedgerCanisterIds,
	splTokenAddresses
}: {
	erc20ContractAddresses: Erc20ContractAddress[];
	icrcLedgerCanisterIds: LedgerCanisterIdText[];
	splTokenAddresses: SplTokenAddress[];
}) => {
	// Avoid to duplicate the sync if already in progress and not yet finished
	if (syncInProgress) {
		return;
	}

	syncInProgress = true;

	try {
		const [
			currentEthPrice,
			currentBtcPrice,
			currentErc20Prices,
			currentIcpPrice,
			currentIcrcPrices,
			currentSolPrice,
			currentSplPrices,
			currentBnbPrice
		] = await Promise.all([
			exchangeRateETHToUsd(),
			exchangeRateBTCToUsd(),
			exchangeRateERC20ToUsd({
				coingeckoPlatformId: 'ethereum',
				contractAddresses: erc20ContractAddresses
			}),
			exchangeRateICPToUsd(),
			exchangeRateICRCToUsd(icrcLedgerCanisterIds),
			exchangeRateSOLToUsd(),
			exchangeRateSPLToUsd(splTokenAddresses),
			exchangeRateBNBToUsd()
		]);

		postMessage({
			msg: 'syncExchange',
			data: {
				currentEthPrice,
				currentBtcPrice,
				currentErc20Prices,
				currentIcpPrice,
				currentIcrcPrices,
				currentSolPrice,
				currentSplPrices,
				currentBnbPrice
			}
		});
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
