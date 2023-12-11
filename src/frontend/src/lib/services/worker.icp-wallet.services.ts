import type { PostMessage, PostMessageDataResponseICPWallet } from '$lib/types/post-message';

export type ICPWalletCallback = (data: PostMessageDataResponseICPWallet | undefined) => void;

export interface ICPWalletWorker {
	start: (params: { callback: ICPWalletCallback }) => void;
	stop: () => void;
}

export const initICPWalletWorker = async (): Promise<ICPWalletWorker> => {
	const WalletWorker = await import('$lib/workers/icp-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	let walletCallback: ICPWalletCallback | undefined;

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseICPWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncICPWallet':
				walletCallback?.(data.data);
				return;
		}
	};

	return {
		start: ({ callback }: { callback: ICPWalletCallback }) => {
			walletCallback = callback;

			worker.postMessage({
				msg: 'startICPWalletTimer'
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopICPWalletTimer'
			});
		}
	};
};
