import { AppWorker } from '$lib/services/_worker.services';
import { syncExchange } from '$lib/services/exchange.services';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange,
	PostMessageDataResponseExchangeError
} from '$lib/types/post-message';
import type { WorkerData } from '$lib/types/worker';

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
					case 'syncExchange':
						syncExchange(data as PostMessageDataResponseExchange | undefined);
						return;
					case 'syncExchangeError':
						console.error(
							'An error occurred while attempting to retrieve the USD exchange rates.',
							(data as PostMessageDataResponseExchangeError | undefined)?.err
						);
						return;
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
