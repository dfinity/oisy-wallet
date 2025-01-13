import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import {
	exchangeRateBTCToUsd,
	exchangeRateERC20ToUsd,
	exchangeRateETHToUsd,
	exchangeRateICPToUsd,
	exchangeRateICRCToUsd,
	exchangeRateSOLToUsd
} from '$lib/services/exchange.services';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
import { errorDetailToString } from '$lib/utils/error.utils';
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
			icrcLedgerCanisterIds: data?.icrcCanisterIds ?? []
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
	icrcLedgerCanisterIds
}: {
	erc20ContractAddresses: Erc20ContractAddress[];
	icrcLedgerCanisterIds: LedgerCanisterIdText[];
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
			currentSolPrice
		] = await Promise.all([
			exchangeRateETHToUsd(),
			exchangeRateBTCToUsd(),
			exchangeRateERC20ToUsd(erc20ContractAddresses),
			exchangeRateICPToUsd(),
			exchangeRateICRCToUsd(icrcLedgerCanisterIds),
			exchangeRateSOLToUsd()
		]);

		postMessage({
			msg: 'syncExchange',
			data: {
				currentEthPrice,
				currentBtcPrice,
				currentErc20Prices,
				currentIcpPrice,
				currentIcrcPrices,
				currentSolPrice
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
