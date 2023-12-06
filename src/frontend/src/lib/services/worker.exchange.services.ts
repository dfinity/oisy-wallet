import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange,
	PostMessageDataResponseExchangeError
} from '$lib/types/post-message';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ExchangeWorker {
	startExchangeTimer: (params: PostMessageDataRequestExchangeTimer) => void;
	stopExchangeTimer: () => void;
}

export const initExchangeWorker = async (): Promise<ExchangeWorker> => {
	const ExchangeWorker = await import('$lib/workers/exchange.worker?worker');
	const exchangeWorker: Worker = new ExchangeWorker.default();

	exchangeWorker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageDataResponseExchange | PostMessageDataResponseExchangeError>
	>) => {
		const { msg, data: value } = data;

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
				toastsError({
					msg: { text: 'An error occurred while attempting to retrieve the USD exchange rates.' },
					err: (value as PostMessageDataResponseExchangeError | undefined)?.err
				});
				return;
		}
	};

	return {
		startExchangeTimer: (data: PostMessageDataRequestExchangeTimer) => {
			exchangeWorker.postMessage({
				msg: 'startExchangeTimer',
				data
			});
		},
		stopExchangeTimer: () => {
			exchangeWorker.postMessage({
				msg: 'stopExchangeTimer'
			});
		}
	};
};
