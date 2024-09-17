import { WalletScheduler } from '$btc/schedulers/wallet.scheduler';
import type { PostMessage, PostMessageDataRequestBtc } from '$lib/types/post-message';

const scheduler: WalletScheduler = new WalletScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestBtc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopBtcWalletTimer':
			scheduler.stop();
			return;
		case 'startBtcWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerBtcWalletTimer':
			await scheduler.trigger(data);
			return;
	}
};
