import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';

const scheduler = new PowProtectionScheduler();

export const onPowProtectionMessage = async ({
																							 data: dataMsg
																						 }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopPowProtectionTimer':
			scheduler.stop();
			return;
		case 'startPowProtectionTimer':
			await scheduler.start(data);
			return;
		case 'triggerPowProtectionTimer':
			await scheduler.trigger(data);
			return;
	}
};
