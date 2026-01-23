import type { PostMessage } from '$lib/types/post-message';
import { KaspaWalletScheduler } from '$kaspa/schedulers/kaspa-wallet.scheduler';
import type { PostMessageDataRequestKaspa } from '$kaspa/types/kaspa-post-message';

const scheduler: KaspaWalletScheduler = new KaspaWalletScheduler();

export const onKaspaWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestKaspa>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopKaspaWalletTimer':
			scheduler.stop();
			return;
		case 'startKaspaWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerKaspaWalletTimer':
			await scheduler.trigger(data);
	}
};
