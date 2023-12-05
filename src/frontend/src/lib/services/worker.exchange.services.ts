import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange
} from '$lib/types/post-message';

export interface ExchangeWorker {
	startExchangeTimer: (params: PostMessageDataRequestExchangeTimer) => void;
	stopExchangeTimer: () => void;
}

export const initExchangeWorker = async (): Promise<ExchangeWorker> => {
	const ExchangeWorker = await import('$lib/workers/exchange.worker?worker');
	const exchangeWorker: Worker = new ExchangeWorker.default();

	exchangeWorker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseExchange>>) => {
		const { msg, data: value } = data;

		switch (msg) {
			case 'syncExchange':
				exchangeStore.set({
					tokenId: ETHEREUM_TOKEN_ID,
					// TODO
					currentPrice: undefined //value?.currentPrices.ethereum
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
