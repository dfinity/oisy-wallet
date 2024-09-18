import { initWalletWorker as initIcWalletWorker } from '$icp/utils/wallet.utils';
import { INDEX_RELOAD_DELAY } from '$lib/constants/app.constants';
import type { WalletWorker } from '$lib/types/listener';
import type { Token, TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';

/**
 * Wait few seconds and trigger the wallet to fetch optimistically new transactions twice.
 */
export const waitAndTriggerWallet = async () => {
	await waitForMilliseconds(INDEX_RELOAD_DELAY);

	// Best case scenario, the transaction has already been noticed by the index canister after INDEX_RELOAD_DELAY seconds.
	emit({ message: 'oisyTriggerWallet' });

	// In case the best case scenario was not met, we optimistically try to retrieve the transactions on more time given that we generally retrieve transactions every WALLET_TIMER_INTERVAL_MILLIS seconds without blocking the UI.
	waitForMilliseconds(INDEX_RELOAD_DELAY).then(() => emit({ message: 'oisyTriggerWallet' }));
};

/**
 * Clean the workers that are not used anymore based on a given list of tokens.
 *
 * @param workers The map of workers defined as `Map<TokenId, WalletWorker>`.
 * @param tokens The list of tokens to check against the workers.
 */
export const cleanWorkers = ({
	workers,
	tokens
}: {
	workers: Map<TokenId, WalletWorker>;
	tokens: Token[];
}) =>
	Array.from(workers.keys())
		.filter((workerTokenId) => !tokens.some(({ id: tokenId }) => workerTokenId === tokenId))
		.forEach((tokenId) => {
			// TODO: use a more functional approach instead of deleting the worker from the map.
			workers.get(tokenId)?.stop();
			workers.delete(tokenId);
		});

/**
 * Load the worker for the token if it is not already loaded.
 *
 * @param workers The map of workers defined as `Map<TokenId, WalletWorker>`.
 * @param token The token to load the worker for.
 */
export const loadWorker = async ({
	workers,
	token
}: {
	workers: Map<TokenId, WalletWorker>;
	token: Token;
}) => {
	if (!workers.has(token.id)) {
		const worker = await initIcWalletWorker({ token });

		worker.stop();
		worker.start();

		workers.set(token.id, worker);
	}
};
