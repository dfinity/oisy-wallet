import { syncExchange } from '$lib/services/exchange.services';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange,
	PostMessageDataResponseExchangeError
} from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

export interface ExchangeWorker {
	startExchangeTimer: (params: PostMessageDataRequestExchangeTimer) => void;
	stopExchangeTimer: () => void;
	destroy: () => void;
}

let errorMessages: { msg: string; timestamp: number }[] = [];

export const initExchangeWorker = async (): Promise<ExchangeWorker> => {
	const ExchangeWorker = await import('$lib/workers/workers?worker');
	let exchangeWorker: Worker | null = new ExchangeWorker.default();

	exchangeWorker.onmessage = ({
		data: dataMsg
	}: MessageEvent<
		PostMessage<PostMessageDataResponseExchange | PostMessageDataResponseExchangeError>
	>) => {
		const { msg, data } = dataMsg;

		// If Coingecko throws an error, for instance, if too many requests are queried within the same minute, it is possible that the window may receive the same error twice because we start and stop the worker based on certain store changes.
		// To prevent the same issue from being displayed multiple times, which would not be user-friendly, the following function keeps track of errors and only displays those that have occurred with a time span of one minute or more.
		const _toastError = (value: PostMessageDataResponseExchangeError | undefined) => {
			const text = 'An error occurred while attempting to retrieve the USD exchange rates.';

			const msg = value?.err;

			if (isNullish(msg)) {
				toastsError({
					msg: { text }
				});
				return;
			}

			const now = Date.now();

			const errorIndex = errorMessages.findIndex(
				({ msg: message, timestamp }) =>
					msg === message && timestamp > new Date(now - 1000 * 60).getTime()
			);

			if (errorIndex > -1) {
				errorMessages.splice(errorIndex, 1);
				errorMessages.push({
					msg,
					timestamp: now
				});
				return;
			}

			errorMessages = [
				...errorMessages,
				{
					msg,
					timestamp: now
				}
			];

			toastsError({
				msg: { text },
				err: value?.err
			});
		};

		switch (msg) {
			case 'syncExchange':
				syncExchange(data as PostMessageDataResponseExchange | undefined);
				return;
			case 'syncExchangeError':
				// TODO: error appears to often currently and is super annoying. So until we figure out a way to solve this, hide the error to the console.
				console.error(
					'An error occurred while attempting to retrieve the USD exchange rates.',
					(data as PostMessageDataResponseExchangeError | undefined)?.err
				);
				// toastError(value as PostMessageDataResponseExchangeError | undefined);
				return;
		}
	};

	const stopTimer = () =>
		exchangeWorker?.postMessage({
			msg: 'stopExchangeTimer'
		});

	let isDestroying = false;

	return {
		startExchangeTimer: (data: PostMessageDataRequestExchangeTimer) => {
			exchangeWorker?.postMessage({
				msg: 'startExchangeTimer',
				data
			});
		},
		stopExchangeTimer: stopTimer,
		destroy: () => {
			if (isDestroying) {
				return;
			}
			isDestroying = true;
			stopTimer();
			exchangeWorker?.terminate();
			exchangeWorker = null;
			isDestroying = false;
			errorMessages = [];
		}
	};
};
