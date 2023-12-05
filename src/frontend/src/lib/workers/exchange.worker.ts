import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import { exchangeRateERC20ToUsd, exchangeRateETHToUsd } from '$lib/services/exchange.services';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>>) => {
	const { msg, data: payload } = data;

	switch (msg) {
		case 'stopExchangeTimer':
			stopTimer();
			return;
		case 'startExchangeTimer':
			await startMetricsTimer(payload);
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const startMetricsTimer = async (data: PostMessageDataRequestExchangeTimer | undefined) => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	const sync = async () => await syncExchange(data?.erc20Addresses ?? []);

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

const syncExchange = async (contractAddresses: Erc20ContractAddress[]) => {
	// Avoid to duplicate the sync if already in progress and not yet finished
	if (syncInProgress) {
		return;
	}

	syncInProgress = true;

	try {
		const [currentEthPrice, currentErc20Prices] = await Promise.all([
			exchangeRateETHToUsd(),
			exchangeRateERC20ToUsd(contractAddresses)
		]);

		postMessage({
			msg: 'syncExchange',
			data: {
				currentEthPrice,
				currentErc20Prices
			}
		});
	} catch (err: unknown) {
		console.error('Unexpected error while fetching symbol average price:', err);
		stopTimer();
	}

	syncInProgress = false;
};
