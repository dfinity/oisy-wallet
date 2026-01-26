import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import type { PostMessage, PostMessageDataRequestBtc } from '$lib/types/post-message';

const scheduler: BtcWalletScheduler = new BtcWalletScheduler();

export const onBtcWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestBtc>>) => {
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
	}
};
