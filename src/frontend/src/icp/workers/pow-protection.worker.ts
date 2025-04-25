import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';

const scheduler = new PowProtectionScheduler();

export const onPowProtectionMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = dataMsg;

	switch (msg) {
		case 'stopPowProtectionTimer':
			scheduler.stop();
			return;
		case 'startPowProtectionTimer':
			await scheduler.start();
			return;
		case 'triggerPowProtectionTimer':
			await scheduler.trigger();
			return;
	}
};
