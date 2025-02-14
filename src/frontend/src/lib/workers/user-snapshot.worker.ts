import { SYNC_USER_SNAPSHOT_TIMER_INTERVAL } from '$lib/constants/user-snapshot.constants';
import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { errorDetailToString } from '$lib/utils/error.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const onUserSnapshotMessage = async ({
	data
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg } = data;

	switch (msg) {
		case 'stopUserSnapshotTimer':
			stopTimer();
			return;
		case 'startUserSnapshotTimer':
			await startUserSnapshotTimer();
			return;
		case 'triggerUserSnapshotTimer':
			await syncUserSnapshot();
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const startUserSnapshotTimer = async () => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	const sync = async () => await syncUserSnapshot();

	// We sync now but also schedule the update afterward
	await sync();

	timer = setInterval(sync, SYNC_USER_SNAPSHOT_TIMER_INTERVAL);
};

const stopTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};

let syncInProgress = false;

const syncUserSnapshot = async () => {
	// Avoid to duplicate the sync if already in progress and not yet finished
	if (syncInProgress) {
		return;
	}

	syncInProgress = true;

	try {
		await registerUserSnapshot();
	} catch (err: unknown) {
		console.error('Unexpected error while taking user snapshot:', err);
		stopTimer();

		postMessage({
			msg: 'syncUserSnapshotError',
			data: {
				err: errorDetailToString(err)
			}
		});
	}

	syncInProgress = false;
};
