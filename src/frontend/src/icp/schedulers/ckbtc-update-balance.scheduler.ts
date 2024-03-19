import { getKnownUtxos, updateBalance } from '$icp/api/ckbtc-minter.api';
import { getUtxos } from '$icp/api/ic.api';
import { CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type { UtxoTxidText } from '$icp/types/ckbtc';
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

		// TODO: getUtxos does not work locally
		const results = await Promise.allSettled([
			getUtxos({ identity, certified: false, network: 'testnet', address: '' }),
			getKnownUtxos({ identity, minterCanisterId })
		]);

		console.log(results);

		try {
			const utxosStatuses = await updateBalance({
				identity,
				minterCanisterId
			});

			this.postUpdateOk(utxosStatuses);
		} catch (err: unknown) {
			if (err instanceof MinterNoNewUtxosError) {
				this.postUtxos(err);
				return;
			}

			// We only log and continue to poll on purpose. UpdateBalance can fail for various reasons.
			console.error(err);
		}
	};

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

	private postUtxos(err: MinterNoNewUtxosError) {
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
