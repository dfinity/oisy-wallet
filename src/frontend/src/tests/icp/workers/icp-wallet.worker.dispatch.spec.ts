import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { onIcpWalletMessage } from '$icp/workers/icp-wallet.worker';
import type {
	PostMessage,
	PostMessageDataRequestIcp,
	PostMessageRequest
} from '$lib/types/post-message';
import { excludeValidMessageEvents } from '$tests/mocks/workers.mock';

const hoisted = vi.hoisted(() => {
	const schedulerInstances: {
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		trigger: ReturnType<typeof vi.fn>;
	}[] = [];

	return { schedulerInstances };
});

vi.mock('$icp/schedulers/ic-wallet-balance-and-transactions.scheduler', () => ({
	IcWalletBalanceAndTransactionsScheduler: class {
		start = vi.fn();
		stop = vi.fn();
		trigger = vi.fn();

		constructor() {
			hoisted.schedulerInstances.push(this);
		}
	}
}));

describe('icp-wallet.worker', () => {
	describe('onIcpWalletMessage', () => {
		const invalidMessages = excludeValidMessageEvents([
			'stopIcpWalletTimer',
			'startIcpWalletTimer',
			'triggerIcpWalletTimer'
		]);

		// The Ledger canister ID drives the scheduler key. Each test starts the schedulers it asserts
		// on, so schedulers left in the module-level map by earlier tests do not interfere.
		const icpData = (ledgerCanisterId: string): PostMessageDataRequestIcp => ({
			ledgerCanisterId,
			indexCanisterId: `${ledgerCanisterId}-index`
		});

		const icpTokenData: PostMessageDataRequestIcp = {
			ledgerCanisterId: ICP_TOKEN.ledgerCanisterId,
			indexCanisterId: ICP_TOKEN.indexCanisterId
		};

		const testIcpTokenData: PostMessageDataRequestIcp = {
			ledgerCanisterId: TESTICP_TOKEN.ledgerCanisterId,
			indexCanisterId: TESTICP_TOKEN.indexCanisterId
		};

		const createEvent = ({
			msg,
			data
		}: {
			msg: PostMessageRequest;
			data?: PostMessageDataRequestIcp;
		}): MessageEvent<PostMessage<PostMessageDataRequestIcp>> =>
			new MessageEvent('message', { data: { msg, data } });

		beforeEach(() => {
			vi.clearAllMocks();
			hoisted.schedulerInstances.length = 0;
		});

		it('should start a scheduler for the Ledger canister', async () => {
			const data = icpData('ledger-start');

			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should trigger a new scheduler for a Ledger canister without one', async () => {
			const data = icpData('ledger-trigger');

			await onIcpWalletMessage(createEvent({ msg: 'triggerIcpWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should trigger the scheduler already started for the Ledger canister', async () => {
			const data = icpData('ledger-start-trigger');

			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data }));
			await onIcpWalletMessage(createEvent({ msg: 'triggerIcpWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should stop the scheduler started for the Ledger canister', async () => {
			const data = icpData('ledger-stop');

			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data }));
			await onIcpWalletMessage(createEvent({ msg: 'stopIcpWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(1);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
		});

		it('should restart the scheduler for a Ledger canister, stopping the previous one', async () => {
			const data = icpData('ledger-restart');

			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data }));
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(data);
		});

		it('should keep separate schedulers for ICP and Test ICP', async () => {
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: icpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: testIcpTokenData }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(icpTokenData);
			expect(hoisted.schedulerInstances[1].start).toHaveBeenCalledExactlyOnceWith(testIcpTokenData);
			expect(hoisted.schedulerInstances[0].stop).not.toHaveBeenCalled();
		});

		it('should keep the ICP scheduler running while Test ICP is stopped and started', async () => {
			// Each wallet worker is stopped and then started when it loads, in the same worker realm.
			await onIcpWalletMessage(createEvent({ msg: 'stopIcpWalletTimer', data: icpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: icpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'stopIcpWalletTimer', data: testIcpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: testIcpTokenData }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].start).toHaveBeenCalledExactlyOnceWith(icpTokenData);
			expect(hoisted.schedulerInstances[0].stop).not.toHaveBeenCalled();

			await onIcpWalletMessage(createEvent({ msg: 'stopIcpWalletTimer', data: testIcpTokenData }));

			expect(hoisted.schedulerInstances[0].stop).not.toHaveBeenCalled();
			expect(hoisted.schedulerInstances[1].stop).toHaveBeenCalledOnce();
		});

		it('should trigger only the scheduler of its own Ledger canister', async () => {
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: icpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'startIcpWalletTimer', data: testIcpTokenData }));
			await onIcpWalletMessage(createEvent({ msg: 'triggerIcpWalletTimer', data: icpTokenData }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].trigger).toHaveBeenCalledExactlyOnceWith(icpTokenData);
			expect(hoisted.schedulerInstances[1].trigger).not.toHaveBeenCalled();
		});

		it('should stop all schedulers when the stop message carries no Ledger canister', async () => {
			await onIcpWalletMessage(
				createEvent({ msg: 'startIcpWalletTimer', data: icpData('ledger-stop-all-a') })
			);
			await onIcpWalletMessage(
				createEvent({ msg: 'startIcpWalletTimer', data: icpData('ledger-stop-all-b') })
			);
			await onIcpWalletMessage(createEvent({ msg: 'stopIcpWalletTimer' }));

			expect(hoisted.schedulerInstances).toHaveLength(2);
			expect(hoisted.schedulerInstances[0].stop).toHaveBeenCalledOnce();
			expect(hoisted.schedulerInstances[1].stop).toHaveBeenCalledOnce();
		});

		it.each(['startIcpWalletTimer', 'triggerIcpWalletTimer'] as const)(
			'should not create a scheduler when %s carries no Ledger canister',
			async (msg) => {
				await onIcpWalletMessage(createEvent({ msg }));

				expect(hoisted.schedulerInstances).toHaveLength(0);
			}
		);

		it.each(invalidMessages)('should not touch any scheduler when message is %s', async (msg) => {
			await onIcpWalletMessage(createEvent({ msg, data: icpData('ledger-invalid') }));

			expect(hoisted.schedulerInstances).toHaveLength(0);
		});
	});
});
