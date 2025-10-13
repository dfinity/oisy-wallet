import { AppWorker } from '$lib/services/_worker.services';
import { idleSignOut } from '$lib/services/auth.services';
import { authRemainingTimeStore, type AuthStoreData } from '$lib/stores/auth.store';
import type { PostMessage, PostMessageDataResponseAuth } from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

export class AuthWorker extends AppWorker {
	constructor(worker: Worker) {
		super(worker);

		worker.onmessage = async ({
			data: dataMsg
		}: MessageEvent<PostMessage<PostMessageDataResponseAuth>>) => {
			const { msg, data } = dataMsg;

			switch (msg) {
				// TODO Investigate extra 'signOutIdleTimer' tick after lock
				// syncAuthIdle stop the idle timer when the user is logOut or locked
				case 'signOutIdleTimer':
					await idleSignOut();
					return;
				case 'delegationRemainingTime':
					authRemainingTimeStore.set(data?.authRemainingTime);
					return;
			}
		};
	}

	static async init(): Promise<AuthWorker> {
		const worker = await AppWorker.getInstance();
		return new AuthWorker(worker);
	}

	syncAuthIdle = ({ auth, locked = false }: { auth: AuthStoreData; locked?: boolean }) => {
		if (locked || isNullish(auth.identity)) {
			this.postMessage({ msg: 'stopIdleTimer' });
			return;
		}

		this.postMessage({ msg: 'startIdleTimer' });
	};
}
