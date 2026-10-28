import { AppWorker } from '$lib/services/_worker.services';
import { syncExchange } from '$lib/services/exchange.services';
import { trackXdrBasketExpiry } from '$lib/services/xdr-basket-analytics.services';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange,
	PostMessageDataResponseExchangeError
} from '$lib/types/post-message';
import type { WorkerData } from '$lib/types/worker';
import { consoleError } from '$lib/utils/console.utils';
import { nonNullish } from '@dfinity/utils';

export class ExchangeWorker extends AppWorker {
	private constructor(worker: WorkerData) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessage<PostMessageDataResponseExchange | PostMessageDataResponseExchangeError>
			>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					case 'syncExchange': {
						const exchangeData = data as PostMessageDataResponseExchange | undefined;

						syncExchange(exchangeData);

						// Tracked here rather than in the worker: analytics only runs on the main thread.
						if (nonNullish(exchangeData?.currentXdrBasketStatus)) {
							trackXdrBasketExpiry(exchangeData.currentXdrBasketStatus);
						}
						return;
					}
					case 'syncExchangeError':
						consoleError(
							'An error occurred while attempting to retrieve the USD exchange rates.',
							(data as PostMessageDataResponseExchangeError | undefined)?.err
						);
				}
			}
		);
	}

	static async init(): Promise<ExchangeWorker> {
		const worker = await AppWorker.getInstance();
		return new ExchangeWorker(worker);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopExchangeTimer'
		});
	};

	startExchangeTimer = (data: PostMessageDataRequestExchangeTimer) => {
		this.postMessage({
			msg: 'startExchangeTimer',
			data
		});
	};

	stopExchangeTimer = () => {
		this.stopTimer();
	};
}
