import { CkETHMinterInfoScheduler } from '$icp/schedulers/cketh-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkETHMinterInfoScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkETHWalletTimer':
			scheduler.stop();
			return;
		case 'startCkETHWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkETHWalletTimer':
			await scheduler.trigger(data);
			return;
	}
};
