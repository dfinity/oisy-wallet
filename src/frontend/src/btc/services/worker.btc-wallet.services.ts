import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$btc/services/btc-listener.services';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { STAGING } from '$lib/constants/app.constants';
import { AppWorker } from '$lib/services/_worker.services';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataRequestBtc } from '$lib/types/post-message';
import type { Token, TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet
} from '$lib/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export class BtcWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly data: PostMessageDataRequestBtc,
		hideToast: boolean
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessage<BtcPostMessageDataResponseWallet>>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					case 'syncBtcWallet':
						syncWallet({
							tokenId,
							data: data as BtcPostMessageDataResponseWallet
						});
						return;

					case 'syncBtcWalletError':
						syncWalletError({
							tokenId,
							error: data.error,
							/**
							 * TODO: Do not launch worker locally if BTC canister is not deployed, and remove "isRegtestNetwork" afterwards.
							 * TODO: Wait for testnet BTC canister to be fixed on the IC side, and remove "isTestnetNetwork" afterwards.
							 * TODO: Investigate the "ingress_expiry" error that is sometimes thrown by update BTC balance call, and remove "isMainnetNetwork" afterwards.
							 * **/
							hideToast
						});
						return;
				}
			}
		);
	}

	static async init({
		token: {
			id: tokenId,
			network: { id: networkId }
		},
		minterCanisterId
	}: {
		token: Token;
		minterCanisterId?: OptionCanisterIdText;
	}): Promise<BtcWalletWorker> {
		await syncWalletFromCache({ tokenId, networkId });

		const isTestnetNetwork = isNetworkIdBTCTestnet(networkId);
		const isRegtestNetwork = isNetworkIdBTCRegtest(networkId);
		const isMainnetNetwork = isNetworkIdBTCMainnet(networkId);

		// TODO: stop/start the worker on address change
		const btcAddress = get(
			isTestnetNetwork
				? btcAddressTestnetStore
				: isRegtestNetwork
					? btcAddressRegtestStore
					: btcAddressMainnetStore
		);
		assertNonNullish(btcAddress, 'No Bitcoin address provided to start Bitcoin wallet worker.');

		const data: PostMessageDataRequestBtc = {
			btcAddress,
			bitcoinNetwork: isTestnetNetwork ? 'testnet' : isRegtestNetwork ? 'regtest' : 'mainnet',
			// only mainnet transactions can be fetched via Blockchain API
			shouldFetchTransactions: isNetworkIdBTCMainnet(networkId),
			minterCanisterId
		};

		const hideToast = isRegtestNetwork || isTestnetNetwork || (isMainnetNetwork && !STAGING);

		const worker = await AppWorker.getInstance();
		return new BtcWalletWorker(worker, tokenId, data, hideToast);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopBtcWalletTimer'
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestBtc>>({
			msg: 'startBtcWalletTimer',
			data: this.data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestBtc>>({
			msg: 'triggerBtcWalletTimer',
			data: this.data
		});
	};
}
