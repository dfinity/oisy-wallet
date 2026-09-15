import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type {
	PostMessageCommon,
	PostMessageDataRequestXrp,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { loadXrpBalance } from '$xrp/rest/xrpl.rest';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

interface XrpWalletStore {
	balance: CertifiedData<Nullish<XrpBalance>> | undefined;
}

export class XrpWalletScheduler implements Scheduler<PostMessageDataRequestXrp> {
	#ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncXrpWalletStatus');

	private store: XrpWalletStore = {
		balance: undefined
	};

	stop() {
		this.timer.stop();
	}

	// The address is part of the ref, so a scheduler re-keyed to another address does not filter its
	// first sync against the previous address's balance (mirrors btc-wallet.scheduler.ts).
	private refFor = ({ xrpNetwork, address }: PostMessageDataRequestXrp): string =>
		`${XRP_TOKEN.symbol}-${xrpNetwork}-${address.data}`;

	protected setRef(data: PostMessageDataRequestXrp | undefined) {
		const newRef = nonNullish(data) ? this.refFor(data) : undefined;

		if (this.#ref !== newRef) {
			this.store = {
				balance: undefined
			};
		}

		this.#ref = newRef;
	}

	async start(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestXrp>({
			interval: XRP_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.trigger<PostMessageDataRequestXrp>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async ({
		address,
		xrpNetwork
	}: {
		address: PostMessageDataRequestXrp['address']['data'];
		xrpNetwork: PostMessageDataRequestXrp['xrpNetwork'];
	}): Promise<CertifiedData<XrpBalance | null>> => ({
		data: await loadXrpBalance({ address, network: xrpNetwork }),
		certified: false
	});

	private loadAndSyncWalletData = async ({
		data,
		expectedRef
	}: {
		data: PostMessageDataRequestXrp;
		expectedRef: string;
	}) => {
		const {
			address: { data: address },
			xrpNetwork
		} = data;

		const balance = await this.loadBalance({ address, xrpNetwork });

		this.syncWalletData({ balance, expectedRef });
	};

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestXrp>) => {
		assertNonNullish(data, 'No data provided to get XRP balance.');

		// The job snapshots the address it was scheduled with; the ref it belongs to is captured
		// alongside so a result landing after the scheduler was re-keyed can be discarded.
		const expectedRef = this.refFor(data);

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ data, expectedRef }),
				maxRetries: 10
			});
		} catch (error: unknown) {
			// A failure for a superseded address must not reset the current account or report an
			// error against it.
			if (expectedRef !== this.#ref) {
				return;
			}

			// Mirror the listener-side UI reset; otherwise the next sync only emits deltas and the UI stays empty.
			this.store = {
				balance: undefined
			};
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({
		balance,
		expectedRef
	}: {
		balance: CertifiedData<XrpBalance | null>;
		expectedRef: string;
	}) => {
		// Discard a result for an address the scheduler has moved on from, before it can be merged
		// into the store that `setRef` already cleared for the new address.
		if (expectedRef !== this.#ref) {
			return;
		}

		if (!this.store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(this.store.balance) || this.store.balance.data !== balance.data;

		if (!newBalance) {
			return;
		}

		this.store = {
			...this.store,
			balance
		};

		this.postMessageWallet({
			wallet: {
				balance
			}
		});
	};

	private postMessageWallet(data: XrpPostMessageDataResponseWallet) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<XrpPostMessageDataResponseWallet>({
			ref: this.#ref,
			msg: 'syncXrpWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.#ref,
			msg: 'syncXrpWalletError',
			data: {
				error
			}
		});
	}
}
