import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import type { PostMessage, PostMessageDataRequestBtc } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

// Keyed by the Bitcoin address so several BTC tokens can share one pooled worker without their
// timers clobbering each other. A dedicated worker only ever holds a single entry.
const schedulers = new Map<string, BtcWalletScheduler>();

const stopAllSchedulers = () => {
	schedulers.forEach((scheduler) => scheduler.stop());
	schedulers.clear();
};

export const onBtcWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestBtc>>) => {
	const { msg, data } = dataMsg;

	const schedulerKey = nonNullish(data) && 'btcAddress' in data ? data.btcAddress.data : undefined;

	switch (msg) {
		case 'stopBtcWalletTimer': {
			if (isNullish(schedulerKey)) {
				stopAllSchedulers();
				return;
			}

			schedulers.get(schedulerKey)?.stop();
			schedulers.delete(schedulerKey);
			return;
		}
		case 'startBtcWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			schedulers.get(schedulerKey)?.stop();

			const scheduler = new BtcWalletScheduler();
			schedulers.set(schedulerKey, scheduler);

			await scheduler.start(data);
			return;
		}
		case 'triggerBtcWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			let scheduler = schedulers.get(schedulerKey);

			if (isNullish(scheduler)) {
				scheduler = new BtcWalletScheduler();
				schedulers.set(schedulerKey, scheduler);
			}

			await scheduler.trigger(data);
		}
	}
};
