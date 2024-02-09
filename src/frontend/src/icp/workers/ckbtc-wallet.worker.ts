import { BtcStatusesScheduler } from '$icp/schedulers/btc-statuses.scheduler';
import { CkBTCUpdateBalanceScheduler } from '$icp/schedulers/ckbtc-update-balance.scheduler';
import type { Scheduler } from '$icp/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequestCkBTC } from '$lib/types/post-message';

const schedulers: Scheduler<PostMessageDataRequestCkBTC>[] = [
	new BtcStatusesScheduler(),
	new CkBTCUpdateBalanceScheduler()
];

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestCkBTC>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCWalletTimer':
			schedulers.forEach((scheduler) => scheduler.stop());
			return;
		case 'startCkBTCWalletTimer':
			await Promise.allSettled(schedulers.map((scheduler) => scheduler.start(data)));
			return;
		case 'triggerCkBTCWalletTimer':
			await Promise.allSettled(schedulers.map((scheduler) => scheduler.trigger(data)));
			return;
	}
};
