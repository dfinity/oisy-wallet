import { AppWorker } from '$lib/services/_worker.services';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestSol,
	PostMessageScheduler
} from '$lib/types/post-message';
import type { Token, TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
import { mapSolSourcesToTokens } from '$sol/services/sol-resolve-signatures.services';
import type {
	SolPostMessageDataResponseWallet,
	SolWalletRouting
} from '$sol/types/sol-post-message';
import type { SplToken } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * The balances and the history of every Solana token of one network, synced by one worker.
 *
 * It is started for a given address and token list and never changes them: when either changes,
 * the caller destroys it and starts another one.
 */
export class SolWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		private readonly routing: SolWalletRouting,
		private readonly data: PostMessageDataRequestSol
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessageScheduler<SolPostMessageDataResponseWallet>>) => {
				const { ref, msg, data } = dataMsg;

				// The scheduler stamps its wallet messages with the network. Its status messages carry no
				// ref, and are not for the wallet stores.
				if (ref !== this.data.solanaNetwork) {
					return;
				}

				switch (msg) {
					case 'syncSolWallet':
						syncWallet({
							data: data as SolPostMessageDataResponseWallet,
							routing: this.routing
						});
						return;

					case 'syncSolWalletError':
						this.tokenIds.forEach((tokenId) =>
							syncWalletError({
								tokenId,
								error: data.error,
								hideToast: true
							})
						);
				}
			}
		);
	}

	get tokenIds(): TokenId[] {
		return [this.routing.nativeTokenId, ...this.routing.splTokenIds.values()];
	}

	/**
	 * @param token The native SOL token of the network.
	 * @param splTokens The enabled SPL tokens of the same network.
	 * @param cachedTokenIds The tokens a previous worker of this network already restored from the
	 * IndexedDB cache. Restoring them again would put back a cached balance older than the one shown.
	 */
	static async init({
		token,
		splTokens,
		cachedTokenIds
	}: {
		token: Token;
		splTokens: SplToken[];
		cachedTokenIds?: ReadonlySet<TokenId>;
	}): Promise<SolWalletWorker> {
		const {
			id: nativeTokenId,
			network: { id: networkId }
		} = token;

		// The cache only shows something while the chain loads: a token whose cache cannot be read must
		// not keep the whole network from syncing.
		await Promise.allSettled(
			[token, ...splTokens]
				.filter(({ id }) => !(cachedTokenIds?.has(id) ?? false))
				.map(({ id: tokenId }) => syncWalletFromCache({ tokenId, networkId }))
		);

		const address = get(
			isNetworkIdSOLDevnet(networkId)
				? solAddressDevnetStore
				: isNetworkIdSOLLocal(networkId)
					? solAddressLocalnetStore
					: solAddressMainnetStore
		);
		assertNonNullish(address, 'No Solana address provided to start Solana wallet worker.');

		const network = mapNetworkIdToNetwork(networkId);
		assertNonNullish(network, 'No Solana network provided to start Solana wallet worker.');

		const tokens = splTokens.map(({ address: tokenAddress, owner }) => ({
			address: tokenAddress,
			owner
		}));

		const routing: SolWalletRouting = {
			nativeTokenId,
			splTokenIds: new Map(splTokens.map(({ address: tokenAddress, id }) => [tokenAddress, id])),
			sourceTokens: await mapSolSourcesToTokens({ address: address.data, tokens })
		};

		const worker = await AppWorker.getInstance();

		return new SolWalletWorker(worker, routing, { address, solanaNetwork: network, tokens });
	}

	protected override stopTimer = () => {
		this.postMessage<PostMessage<PostMessageDataRequestSol>>({
			msg: 'stopSolWalletTimer',
			data: this.data
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestSol>>({
			msg: 'startSolWalletTimer',
			data: this.data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestSol>>({
			msg: 'triggerSolWalletTimer',
			data: this.data
		});
	};
}
