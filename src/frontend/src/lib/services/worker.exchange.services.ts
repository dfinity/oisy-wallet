import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange,
	PostMessageDataResponseExchangeError
} from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ExchangeWorker {
	startExchangeTimer: (params: PostMessageDataRequestExchangeTimer) => void;
	stopExchangeTimer: () => void;
	destroy: () => void;
}

let errorMessages: { msg: string; timestamp: number }[] = [];

export const initExchangeWorker = async (): Promise<ExchangeWorker> => {
	const ExchangeWorker = await import('$lib/workers/exchange.worker?worker');
	const exchangeWorker: Worker = new ExchangeWorker.default();

	exchangeWorker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageDataResponseExchange | PostMessageDataResponseExchangeError>
	>) => {
		const { msg, data: value } = data;

		// If Coingecko throws an error, for instance, if too many requests are queried within the same minute, it is possible that the window may receive the same error twice because we start and stop the worker based on certain store changes.
		// To prevent the same issue from being displayed multiple times, which would not be user-friendly, the following function keeps track of errors and only displays those that have occurred with a time span of one minute or more.
		const toastError = (value: PostMessageDataResponseExchangeError | undefined) => {
			const text =
				'An error occurred while attempting to retrieve the USD exchange rates.' as const;

			const msg = (value as PostMessageDataResponseExchangeError | undefined)?.err;

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
				err: (value as PostMessageDataResponseExchangeError | undefined)?.err
			});
		};

		switch (msg) {
			case 'syncExchange':
				// Avoid the duplication of the cast. Just handy to do so here to improve readability.
				// eslint-disable-next-line no-case-declarations
				const optionValue = value as PostMessageDataResponseExchange | undefined;

				exchangeStore.set([
					{
						tokenId: ETHEREUM_TOKEN_ID,
						currentPrice: optionValue?.currentEthPrice?.ethereum
					},
					{
						tokenId: ICP_TOKEN_ID,
						currentPrice: optionValue?.currentIcpPrice?.['internet-computer']
					},
					...Object.entries(optionValue?.currentErc20Prices ?? {})
						.map(([key, currentPrice]) => {
							const tokens = get(erc20Tokens);
							const token = tokens.find(
								({ address }) => address.toLowerCase() === key.toLowerCase()
							);
							return nonNullish(token) ? { tokenId: token.id, currentPrice } : undefined;
						})
						.filter(nonNullish)
				]);
				return;
			case 'syncExchangeError':
				toastError(value as PostMessageDataResponseExchangeError | undefined);
				return;
		}
	};

	const stopTimer = () =>
		exchangeWorker.postMessage({
			msg: 'stopExchangeTimer'
		});

	return {
		startExchangeTimer: (data: PostMessageDataRequestExchangeTimer) => {
			exchangeWorker.postMessage({
				msg: 'startExchangeTimer',
				data
			});
		},
		stopExchangeTimer: stopTimer,
		destroy: () => {
			stopTimer();
			errorMessages = [];
		}
	};
};
