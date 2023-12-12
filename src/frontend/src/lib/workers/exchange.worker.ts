import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import {exchangeRateERC20ToUsd, exchangeRateETHToUsd, exchangeRateICPToUsd} from '$lib/services/exchange.services';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
import { errorDetailToString } from '$lib/utils/error.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>>) => {
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
		const [currentEthPrice, currentErc20Prices, currentIcpPrice] = await Promise.all([
			exchangeRateETHToUsd(),
			exchangeRateERC20ToUsd(contractAddresses),
			exchangeRateICPToUsd()
		]);

		postMessage({
			msg: 'syncExchange',
			data: {
				currentEthPrice,
				currentErc20Prices,
				currentIcpPrice
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
