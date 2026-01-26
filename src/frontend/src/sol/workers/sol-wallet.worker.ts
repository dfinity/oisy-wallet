import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';

const scheduler: SolWalletScheduler = new SolWalletScheduler();

export const onSolWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestSol>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopSolWalletTimer':
			scheduler.stop();
			return;
		case 'startSolWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerSolWalletTimer':
			await scheduler.trigger(data);
	}
};
