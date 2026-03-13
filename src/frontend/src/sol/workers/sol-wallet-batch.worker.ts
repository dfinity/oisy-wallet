import type { PostMessage, PostMessageDataRequestSolBatch } from '$lib/types/post-message';
import { SolWalletBatchScheduler } from '$sol/schedulers/sol-wallet-batch.scheduler';

const scheduler = new SolWalletBatchScheduler();

export const onSolBatchWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestSolBatch>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopSolBatchWalletTimer':
			scheduler.stop();
			return;
		case 'startSolBatchWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerSolBatchWalletTimer':
			await scheduler.trigger(data);
	}
};
