import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import { exchangeRateETHToUsd } from '$lib/providers/binance.providers';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'stopExchangeTimer':
			stopTimer();
			return;
		case 'startExchangeTimer':
			await startMetricsTimer();
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const startMetricsTimer = async () => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	const sync = async () => await syncExchange();

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

const syncExchange = async () => {
	// Avoid to duplicate the sync if already in progress and not yet finished
	if (syncInProgress) {
		return;
	}

	syncInProgress = true;

	try {
		const avgPrice = await exchangeRateETHToUsd();

		postMessage({
			msg: 'syncExchange',
			data: {
				avgPrice
			}
		});
	} catch (err: unknown) {
		console.error('Unexpected error while fetching symbol average price:', err);
		stopTimer();
	}

	syncInProgress = false;
};
