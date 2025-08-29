import { BITCOIN_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import { getUtxosQuery } from '$icp/api/bitcoin.api';
import { getBtcAddress, getKnownUtxos, updateBalance } from '$icp/api/ckbtc-minter.api';
import { CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import type { BtcAddressData } from '$icp/stores/btc.store';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageDataRequestIcCkBTCUpdateBalance,
	PostMessageDataResponseBTCAddress,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import {
	MinterNoNewUtxosError,
	type BitcoinNetwork,
	type PendingUtxo,
	type UtxoStatus
} from '@dfinity/ckbtc';
import { assertNonNullish, isNullish, jsonReplacer, uint8ArrayToHexString } from '@dfinity/utils';

export class CkBTCUpdateBalanceScheduler
	implements Scheduler<PostMessageDataRequestIcCkBTCUpdateBalance>
{
	private timer = new SchedulerTimer('syncCkBTCUpdateBalanceStatus');

	private btcAddress: string | undefined;

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCkBTCUpdateBalance | undefined) {
		await this.timer.start<PostMessageDataRequestIcCkBTCUpdateBalance>({
			interval: CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS,
			job: this.updateBalance,
			data
		});
	}

	async trigger(data: PostMessageDataRequestIcCkBTCUpdateBalance | undefined) {
		await this.timer.trigger<PostMessageDataRequestIcCkBTCUpdateBalance>({
			job: this.updateBalance,
			data
		});
	}

	private updateBalance = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestIcCkBTCUpdateBalance>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to update the BTC balance.'
		);

		const bitcoinNetwork = data?.bitcoinNetwork;

		assertNonNullish(bitcoinNetwork, 'No BTC network provided to check for update balance.');

		const address =
			data?.btcAddress ??
			this.btcAddress ??
			(await this.loadBtcAddress({ minterCanisterId, identity }));

		assertNonNullish(address, 'No BTC address could be derived from the ckBTC minter.');

		const pendingUtxos = await this.hasPendingUtxos({
			minterCanisterId,
			identity,
			btcAddress: address,
			bitcoinNetwork
		});

		// All Utxos have been processed by the ckBTC minter, therefore no update balance call is required to process potential pending utxos - i.e., potential conversion from BTC to ckBTC.
		if (!pendingUtxos) {
			return;
		}

		try {
			const utxosStatuses = await updateBalance({
				identity,
				minterCanisterId
			});

			this.postUpdateOk(utxosStatuses);
		} catch (err: unknown) {
			// Given that we use queries to determine whether an update balance should be triggered, we continue to display only pending Utxos based on potential errors, as these results come from an update call and are therefore known to be accurate.
			if (err instanceof MinterNoNewUtxosError) {
				this.postPendingUtxos(err);
				return;
			}

			// We only log and continue to poll on purpose. UpdateBalance can fail for various non UX blocker reasons and user can trigger it again manually.
			console.error(err);
		}
	};

	private async loadBtcAddress(params: {
		identity: OptionIdentity;
		minterCanisterId: CanisterIdText;
	}): Promise<string> {
		const address = await getBtcAddress(params);

		// Save address for next timer
		this.btcAddress = address;

		// Send it to the UI to save the address in the store. It can be useful for the user when they want to open the "Receive" modal. That way the client does not have to fetch it again.
		this.postMessageBtcAddress({
			data: address,
			certified: true
		});

		return this.btcAddress;
	}

	private postMessageBtcAddress(address: BtcAddressData) {
		this.timer.postMsg<PostMessageDataResponseBTCAddress>({
			msg: 'syncBtcAddress',
			data: {
				address
			}
		});
	}

	private async hasPendingUtxos({
		identity,
		minterCanisterId,
		btcAddress: address,
		bitcoinNetwork: network
	}: {
		identity: OptionIdentity;
		minterCanisterId: CanisterIdText;
		btcAddress: string;
		bitcoinNetwork: BitcoinNetwork;
	}): Promise<boolean> {
		const bitcoinCanisterId = BITCOIN_CANISTER_IDS[minterCanisterId];

		// TODO: Deploy Bitcoin canister for local development.
		// We currently do not deploy locally the Bitcoin canister. That is why we do not throw an error if undefined.
		// Not checking if there are pending Utxos is not an issue for the user flow, it "just" has for effect to stress the ckBTC minter more as it will lead to calling "update balance" more often. Per extension, it consumes more cycles.
		if (isNullish(bitcoinCanisterId)) {
			return true;
		}

		const [{ utxos: allUtxos }, knownUtxos] = await Promise.all([
			getUtxosQuery({
				identity,
				network,
				address,
				bitcoinCanisterId
			}),
			getKnownUtxos({ identity, minterCanisterId })
		]);

		const allUtxosTxids = allUtxos.map(({ outpoint: { txid } }) => utxoTxIdToString(txid));
		const knownUtxosTxids = knownUtxos.map(({ outpoint: { txid } }) => utxoTxIdToString(txid));

		return allUtxosTxids.some((txid) => !knownUtxosTxids.includes(txid));
	}

	private postUpdateOk(utxosStatuses: UtxoStatus[]) {
		const data: CertifiedData<UtxoTxidText[]> = {
			certified: true,
			data: utxosStatuses
				.map((utxosStatus) => {
					if ('ValueTooSmall' in utxosStatus) {
						return utxosStatus.ValueTooSmall;
					}

					if ('Tainted' in utxosStatus) {
						return utxosStatus.Tainted;
					}

					if ('Minted' in utxosStatus) {
						return utxosStatus.Minted.utxo;
					}

					return utxosStatus.Checked;
				})
				.map(({ outpoint: { txid } }) => uint8ArrayToHexString(txid))
		};

		this.timer.postMsg<PostMessageJsonDataResponse>({
			msg: 'syncCkBTCUpdateOk',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	}

	private postPendingUtxos(err: MinterNoNewUtxosError) {
		const { pendingUtxos } = err;

		const data: CertifiedData<PendingUtxo[]> = {
			certified: true,
			data: pendingUtxos
		};

		this.timer.postMsg<PostMessageJsonDataResponse>({
			msg: 'syncBtcPendingUtxos',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	}
}
