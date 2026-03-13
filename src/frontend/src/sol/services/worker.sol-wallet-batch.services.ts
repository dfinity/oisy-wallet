import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { AppWorker } from '$lib/services/_worker.services';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataRequestSolBatch } from '$lib/types/post-message';
import type { Token, TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const buildTokenRef = (token: Token): string => {
	const network = mapNetworkIdToNetwork(token.network.id);
	const tokenAddress = isTokenSpl(token) ? token.address : undefined;
	return `${tokenAddress ?? SOLANA_TOKEN.symbol}-${network}`;
};

export class SolBatchWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		private readonly refToTokenId: Map<string, TokenId>,
		private readonly data: PostMessageDataRequestSolBatch
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessage<SolPostMessageDataResponseWallet>>) => {
				const { ref, msg, data } = dataMsg;

				if (isNullish(ref)) {
					return;
				}

				const tokenId = this.refToTokenId.get(ref);

				if (isNullish(tokenId)) {
					return;
				}

				switch (msg) {
					case 'syncSolWallet':
						syncWallet({
							tokenId,
							data: data as SolPostMessageDataResponseWallet
						});
						return;

					case 'syncSolWalletError':
						syncWalletError({
							tokenId,
							error: data.error,
							hideToast: true
						});
				}
			}
		);
	}

	static async init({ tokens }: { tokens: Token[] }): Promise<SolBatchWalletWorker> {
		await Promise.all(
			tokens.map(({ id: tokenId, network: { id: networkId } }) =>
				syncWalletFromCache({ tokenId, networkId })
			)
		);

		const refToTokenId = new Map<string, TokenId>();
		const batchTokens: PostMessageDataRequestSolBatch['tokens'] = [];

		for (const token of tokens) {
			const {
				id: tokenId,
				network: { id: networkId }
			} = token;

			const isDevnetNetwork = isNetworkIdSOLDevnet(networkId);
			const isLocalNetwork = isNetworkIdSOLLocal(networkId);

			const address = get(
				isDevnetNetwork
					? solAddressDevnetStore
					: isLocalNetwork
						? solAddressLocalnetStore
						: solAddressMainnetStore
			);
			assertNonNullish(address, 'No Solana address provided to start batch Solana wallet worker.');

			const network = mapNetworkIdToNetwork(networkId);
			assertNonNullish(network, 'No Solana network provided to start batch Solana wallet worker.');

			const { address: tokenAddress, owner: tokenOwnerAddress } = isTokenSpl(token)
				? token
				: { address: undefined, owner: undefined };

			const ref = buildTokenRef(token);

			refToTokenId.set(ref, tokenId);
			batchTokens.push({
				ref,
				address,
				solanaNetwork: network,
				tokenAddress,
				tokenOwnerAddress
			});
		}

		const data: PostMessageDataRequestSolBatch = { tokens: batchTokens };

		const worker = await AppWorker.getInstance();
		return new SolBatchWalletWorker(worker, refToTokenId, data);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopSolBatchWalletTimer'
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestSolBatch>>({
			msg: 'startSolBatchWalletTimer',
			data: this.data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestSolBatch>>({
			msg: 'triggerSolBatchWalletTimer',
			data: this.data
		});
	};
}
