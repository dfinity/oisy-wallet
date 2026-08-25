import type { PostMessage, PostMessageDataRequestXrp } from '$lib/types/post-message';
import { XrpWalletScheduler } from '$xrp/schedulers/xrp-wallet.scheduler';

const scheduler: XrpWalletScheduler = new XrpWalletScheduler();

export const onXrpWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestXrp>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopXrpWalletTimer':
			scheduler.stop();
			return;
		case 'startXrpWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerXrpWalletTimer':
			await scheduler.trigger(data);
	}
};
