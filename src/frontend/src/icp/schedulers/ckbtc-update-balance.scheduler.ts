import { getBtcAddress, getKnownUtxos, updateBalance } from '$icp/api/ckbtc-minter.api';
import { getUtxos } from '$icp/api/ic.api';
import {
	BTC_NETWORK,
	CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS
} from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageDataRequestIcCkBTCUpdateBalance,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import {
	BtcNetwork,
	MinterNoNewUtxosError,
	type PendingUtxo,
	type UtxoStatus
} from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer, uint8ArrayToHexString } from '@dfinity/utils';

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

		const address =
			data?.btcAddress ??
			this.btcAddress ??
			(await this.loadBtcAddress({ minterCanisterId, identity }));

		assertNonNullish(address, 'No BTC address could be derived from the ckBTC minter.');

		const pendingUtxos = await this.hasPendingUtxos({
			minterCanisterId,
			identity,
			btcAddress: address
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
		// Save address for next timer
		this.btcAddress = await getBtcAddress(params);

		return this.btcAddress;
	}

	private async hasPendingUtxos({
		identity,
		minterCanisterId,
		btcAddress: address
	}: {
		identity: OptionIdentity;
		minterCanisterId: CanisterIdText;
		btcAddress: string;
	}): Promise<boolean> {
		const [{ utxos: allUtxos }, knownUtxos] = await Promise.all([
			getUtxos({
				identity,
				certified: false,
				network: BTC_NETWORK === BtcNetwork.Testnet ? 'testnet' : 'mainnet',
				address
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
