import { BtcStatusesScheduler } from '$icp/schedulers/btc-statuses.scheduler';
import { CkBTCUpdateBalanceScheduler } from '$icp/schedulers/ckbtc-update-balance.scheduler';
import type { Scheduler } from '$icp/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequestCkBTC } from '$lib/types/post-message';

const statusesScheduler = new BtcStatusesScheduler();
const updateBalanceScheduler = new CkBTCUpdateBalanceScheduler();

const schedulers: Scheduler<PostMessageDataRequestCkBTC>[] = [
	statusesScheduler,
	updateBalanceScheduler
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
			// Update balance is not linked to any other events within the wallet. In addition, a trigger is called after manually executing "update balance" on the client side. That's why we don't want to update balance twice in a row.
			await statusesScheduler.trigger(data);
			return;
	}
};
