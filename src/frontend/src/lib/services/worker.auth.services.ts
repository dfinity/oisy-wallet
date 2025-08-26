import { idleSignOut } from '$lib/services/auth.services';
import { authRemainingTimeStore, type AuthStoreData } from '$lib/stores/auth.store';
import type { PostMessage, PostMessageDataResponseAuth } from '$lib/types/post-message';

export const initAuthWorker = async () => {
	const AuthWorker = await import('$lib/workers/workers?worker');
	const authWorker: Worker = new AuthWorker.default();

	authWorker.onmessage = async ({
		data: dataMsg
	}: MessageEvent<PostMessage<PostMessageDataResponseAuth>>) => {
		const { msg, data } = dataMsg;

		switch (msg) {
			case 'signOutIdleTimer':
				await idleSignOut();
				return;
			case 'delegationRemainingTime':
				authRemainingTimeStore.set(data?.authRemainingTime);
				return;
		}
	};

	// TODO Investigate extra 'signOutIdleTimer' tick after lock
	// syncAuthIdle stop the idle timer when the user is logOut or locked

	return {
		syncAuthIdle: ({ auth, locked = false }: { auth: AuthStoreData; locked?: boolean }) => {
			if (locked || !auth.identity) {
				authWorker.postMessage({ msg: 'stopIdleTimer' });
				return;
			}

			authWorker.postMessage({ msg: 'startIdleTimer' });
		}
	};
};
