import { AppWorker } from '$lib/services/_worker.services';
import { idleSignOut } from '$lib/services/auth.services';
import { authRemainingTimeStore, type AuthStoreData } from '$lib/stores/auth.store';
import type {
	PostMessage,
	PostMessageDataResponseAuth,
	PostMessageDataResponseAuthSignOut
} from '$lib/types/post-message';
import type { WorkerData } from '$lib/types/worker';
import { isNullish } from '@dfinity/utils';

export class AuthWorker extends AppWorker {
	private constructor(worker: WorkerData) {
		super(worker);

		this.setOnMessage(
			async ({
				data: dataMsg
			}: MessageEvent<
				PostMessage<PostMessageDataResponseAuth | PostMessageDataResponseAuthSignOut>
			>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					// TODO Investigate extra 'signOutIdleTimer' tick after lock
					// syncAuthIdle stop the idle timer when the user is logOut or locked
					case 'signOutIdleTimer':
						await idleSignOut({
							// Without the cause, the cache is kept: the lock page still offers to log out.
							delegationExpired:
								(data as PostMessageDataResponseAuthSignOut | undefined)?.delegationExpired ?? true
						});
						return;
					case 'delegationRemainingTime':
						authRemainingTimeStore.set(
							(data as PostMessageDataResponseAuth | undefined)?.authRemainingTime
						);
				}
			}
		);
	}

	static async init(): Promise<AuthWorker> {
		const worker = await AppWorker.getInstance();
		return new AuthWorker(worker);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopIdleTimer'
		});
	};

	syncAuthIdle = ({ auth, locked = false }: { auth: AuthStoreData; locked?: boolean }) => {
		if (locked || isNullish(auth.identity)) {
			this.stopTimer();
			return;
		}

		this.postMessage({ msg: 'startIdleTimer' });
	};
}
