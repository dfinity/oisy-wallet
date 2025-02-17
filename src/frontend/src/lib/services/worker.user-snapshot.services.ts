import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataResponse,
	PostMessageDataResponseError
} from '$lib/types/post-message';

export type UserSnapshotWorker = WalletWorker;

export const initUserSnapshotWorker = async (): Promise<UserSnapshotWorker> => {
	const UserSnapshotWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new UserSnapshotWorker.default();

	worker.onmessage = ({ data }: MessageEvent<PostMessage<PostMessageDataResponse>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncUserSnapshotError':
				console.error(
					'An error occurred while attempting to register the user snapshot.',
					(data.data as PostMessageDataResponseError).error
				);
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startUserSnapshotTimer'
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopUserSnapshotTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerUserSnapshotTimer'
			});
		}
	};
};
