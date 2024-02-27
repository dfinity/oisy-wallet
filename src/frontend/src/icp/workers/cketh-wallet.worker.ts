import { CkethWalletScheduler } from '$icp/schedulers/cketh-wallet.scheduler';
import type { PostMessage, PostMessageDataRequestCkETH } from '$lib/types/post-message';

const scheduler = new CkethWalletScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestCkETH>>) => {
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
