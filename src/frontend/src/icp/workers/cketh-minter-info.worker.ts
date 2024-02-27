import { CkETHMinterInfoScheduler } from '$icp/schedulers/cketh-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new CkETHMinterInfoScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkETHMinterInfoTimer':
			scheduler.stop();
			return;
		case 'startCkETHMinterInfoTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkETHMinterInfoTimer':
			await scheduler.trigger(data);
			return;
	}
};
