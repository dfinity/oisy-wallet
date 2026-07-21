import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';
import { isNullish, nonNullish } from '@dfinity/utils';

// Keyed by token address + network (native SOL falls back to the token symbol) so several Solana
// tokens can share one pooled worker without their timers clobbering each other. A dedicated
// worker only ever holds a single entry. Must match the `ref` stamped by SolWalletScheduler and
// filtered on in worker.sol-wallet.services.ts.
const schedulers = new Map<string, SolWalletScheduler>();

const stopAllSchedulers = () => {
	schedulers.forEach((scheduler) => scheduler.stop());
	schedulers.clear();
};

export const onSolWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestSol>>) => {
	const { msg, data } = dataMsg;

	const schedulerKey =
		nonNullish(data) && 'solanaNetwork' in data
			? `${data.tokenAddress ?? SOLANA_TOKEN.symbol}-${data.solanaNetwork}`
			: undefined;

	switch (msg) {
		case 'stopSolWalletTimer': {
			if (isNullish(schedulerKey)) {
				stopAllSchedulers();
				return;
			}

			schedulers.get(schedulerKey)?.stop();
			schedulers.delete(schedulerKey);
			return;
		}
		case 'startSolWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			schedulers.get(schedulerKey)?.stop();

			const scheduler = new SolWalletScheduler();
			schedulers.set(schedulerKey, scheduler);

			await scheduler.start(data);
			return;
		}
		case 'triggerSolWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			let scheduler = schedulers.get(schedulerKey);

			if (isNullish(scheduler)) {
				scheduler = new SolWalletScheduler();
				schedulers.set(schedulerKey, scheduler);
			}

			await scheduler.trigger(data);
		}
	}
};
