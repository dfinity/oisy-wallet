import type {
	PostMessage,
	PostMessageDataResponse,
	PostMessageDataResponseUserSnapshotError
} from '$lib/types/post-message';

export interface UserSnapshotWorker {
	startUserSnapshotTimer: () => void;
	stopUserSnapshotTimer: () => void;
	triggerUserSnapshotTimer: () => void;
	destroy: () => void;
}

export const initUserSnapshotWorker = async (): Promise<UserSnapshotWorker> => {
	const UserSnapshotWorker = await import('$lib/workers/workers?worker');
	const userSnapshotWorker: Worker = new UserSnapshotWorker.default();

	userSnapshotWorker.onmessage = ({
		data
	}: MessageEvent<
		PostMessage<PostMessageDataResponse | PostMessageDataResponseUserSnapshotError>
	>) => {
		const { msg, data: value } = data;

		switch (msg) {
			case 'syncUserSnapshotError':
				console.error(
					'An error occurred while attempting to register the user snapshot.',
					(value as PostMessageDataResponseUserSnapshotError | undefined)?.err
				);
				return;
		}
	};

	const stopTimer = () =>
		userSnapshotWorker.postMessage({
			msg: 'stopUserSnapshotTimer'
		});

	return {
		startUserSnapshotTimer: () => {
			userSnapshotWorker.postMessage({ msg: 'startUserSnapshotTimer' });
		},
		stopUserSnapshotTimer: stopTimer,
		triggerUserSnapshotTimer: () => {
			userSnapshotWorker.postMessage({ msg: 'triggerUserSnapshotTimer' });
		},
		destroy: () => {
			stopTimer();
		}
	};
};
