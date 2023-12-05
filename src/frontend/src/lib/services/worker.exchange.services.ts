import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange
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
	}: MessageEvent<PostMessage<PostMessageDataResponseExchange>>) => {
		const { msg, data: value } = data;

		switch (msg) {
			case 'syncExchange':
				exchangeStore.set([
					{
						tokenId: ETHEREUM_TOKEN_ID,
						currentPrice: value?.currentEthPrice?.ethereum
					},
					...Object.entries(value?.currentErc20Prices ?? {})
						.map(([key, currentPrice]) => {
							const tokens = get(erc20Tokens);
							const token = tokens.find(({ address }) => address === key);
							return nonNullish(token) ? { tokenId: token.id, currentPrice } : undefined;
						})
						.filter(nonNullish)
				]);
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
