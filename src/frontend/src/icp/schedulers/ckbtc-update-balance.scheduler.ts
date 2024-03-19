import { getKnownUtxos, updateBalance } from '$icp/api/ckbtc-minter.api';
import { getUtxos } from '$icp/api/ic.api';
import { CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageDataRequestIcCk,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { UtxoStatus } from '@dfinity/ckbtc';
import { MinterNoNewUtxosError, type PendingUtxo } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer, uint8ArrayToHexString } from '@dfinity/utils';

export class CkBTCUpdateBalanceScheduler implements Scheduler<PostMessageDataRequestIcCk> {
	private timer = new SchedulerTimer('syncCkBTCUpdateBalanceStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.start<PostMessageDataRequestIcCk>({
			interval: CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS,
			job: this.updateBalance,
			data
		});
	}

	async trigger(data: PostMessageDataRequestIcCk | undefined) {
		await this.timer.trigger<PostMessageDataRequestIcCk>({
			job: this.updateBalance,
			data
		});
	}

	private updateBalance = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestIcCk>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to update the BTC balance.'
		);

		const pendingUtxos = await this.hasPendingUtxos({ minterCanisterId, identity });

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

			// We only log and continue to poll on purpose. UpdateBalance can fail for various reasons.
			console.error(err);
		}
	};

	private async hasPendingUtxos({
		identity,
		minterCanisterId
	}: {
		identity: OptionIdentity;
		minterCanisterId: CanisterIdText;
	}): Promise<boolean> {
		const [{ utxos: allUtxos }, knownUtxos] = await Promise.all([
			getUtxos({
				identity,
				certified: false,
				network: 'testnet',
				address: 'bcrt1q5eshwxjsz2slgr77qn35er7z0ptwxcaee5d04l'
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
