import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';
import { isNullish } from '@dfinity/utils';

// Each Solana network gets a dedicated worker, so a realm only ever runs one scheduler.
let scheduler: SolWalletScheduler | undefined;

export const onSolWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestSol>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopSolWalletTimer': {
			scheduler?.stop();
			scheduler = undefined;
			return;
		}
		case 'startSolWalletTimer': {
			// `SchedulerTimer.start` returns early while its timer runs, so a start for another token
			// list or address would keep the old one syncing. A new scheduler starts from a clean state.
			scheduler?.stop();

			scheduler = new SolWalletScheduler();

			await scheduler.start(data);
			return;
		}
		case 'triggerSolWalletTimer': {
			if (isNullish(scheduler)) {
				scheduler = new SolWalletScheduler();
			}

			await scheduler.trigger(data);
		}
	}
};
