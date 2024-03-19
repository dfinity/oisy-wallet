import { CkBTCUpdateBalanceScheduler } from '$icp/schedulers/ckbtc-update-balance.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkBTCUpdateBalanceScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCUpdateBalanceTimer':
			scheduler.stop();
			return;
		case 'startCkBTCUpdateBalanceTimer':
			await scheduler.start(data);
			return;
	}
};
