import { UserSnapshotScheduler } from '$lib/schedulers/user-snapshot.scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';

const scheduler: UserSnapshotScheduler = new UserSnapshotScheduler();

export const onUserSnapshotMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = dataMsg;

	switch (msg) {
		case 'stopUserSnapshotTimer':
			scheduler.stop();
			return;
		case 'startUserSnapshotTimer':
			await scheduler.start();
			return;
		case 'triggerUserSnapshotTimer':
			await scheduler.trigger();
			return;
	}
};
