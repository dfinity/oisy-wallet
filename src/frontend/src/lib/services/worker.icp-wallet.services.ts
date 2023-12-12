import type { PostMessage, PostMessageDataResponseIcpWallet } from '$lib/types/post-message';

export type IcpWalletCallback = (data: PostMessageDataResponseIcpWallet | undefined) => void;

export interface IcpWalletWorker {
	start: (params: { callback: IcpWalletCallback }) => void;
	stop: () => void;
}

export const initIcpWalletWorker = async (): Promise<IcpWalletWorker> => {
	const WalletWorker = await import('$lib/workers/icp-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	let walletCallback: IcpWalletCallback | undefined;

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseIcpWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncIcpWallet':
				walletCallback?.(data.data);
				return;
		}
	};

	return {
		start: ({ callback }: { callback: IcpWalletCallback }) => {
			walletCallback = callback;

			worker.postMessage({
				msg: 'startIcpWalletTimer'
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopIcpWalletTimer'
			});
		}
	};
};
