import {
	syncPowNextAllowance,
	syncPowProgress
} from '$icp/services/pow-protector-listener.services';
import { AppWorker } from '$lib/services/_worker.services';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';
import type { WorkerData } from '$lib/types/worker';

// TODO: add tests for POW worker/scheduler
export class PowProtectorWorker extends AppWorker {
	private constructor(worker: WorkerData) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessage<
					| PostMessageDataResponsePowProtectorProgress
					| PostMessageDataResponsePowProtectorNextAllowance
					| PostMessageDataResponseError
				>
			>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					case 'syncPowProgress': {
						syncPowProgress({
							data: data as PostMessageDataResponsePowProtectorProgress
						});
						return;
					}
					case 'syncPowNextAllowance': {
						// Check if data.data exists and has proper structure
						syncPowNextAllowance({
							data: data as PostMessageDataResponsePowProtectorNextAllowance
						});
						return;
					}
				}
			}
		);
	}

	static async init(): Promise<PowProtectorWorker> {
		const worker = await AppWorker.getInstance();
		return new PowProtectorWorker(worker);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopPowProtectionTimer'
		});
	};

	start = () => {
		this.postMessage({
			msg: 'startPowProtectionTimer'
		} as PostMessage<PostMessageDataRequest>);
	};

	trigger = () => {
		this.postMessage({
			msg: 'triggerPowProtectionTimer'
		} as PostMessage<PostMessageDataRequest>);
	};
}
