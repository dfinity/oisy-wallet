import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import type { PostMessage, PostMessageDataRequestPowProtector } from '$lib/types/post-message';

const scheduler = new PowProtectionScheduler();

export const onPowProtectionMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestPowProtector>>) => {
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
