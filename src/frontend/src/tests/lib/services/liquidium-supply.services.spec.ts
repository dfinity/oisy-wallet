import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import { executeLiquidiumSupply } from '$lib/services/liquidium-supply.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { NativeAddressSupplyTarget, SupplyFlow, SupplyTarget } from '@liquidium/client';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/liquidium.services', () => ({ getOrCreateLiquidiumProfile: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn()
}));
vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));

describe('liquidium-supply.services', () => {
	const ethAddress = '0x1111111111111111111111111111111111111111' as EthAddress;
	const profileId = 'profile-1';
	const poolId = 'pool-btc';

	const supply = vi.fn();
	const submit = vi.fn();
	const broadcast = vi.fn();
	const createActiveUserTransaction = vi.mocked(
		activeUserTransactionsServices.createActiveUserTransaction
	);

	const nativeTarget: NativeAddressSupplyTarget = {
		type: 'nativeAddress',
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		action: 'deposit',
		address: 'bc1qexample'
	};

	const buildFlow = (target: SupplyTarget): SupplyFlow => ({
		type: 'transfer',
		target,
		status: {
			operation: 'deposit',
			state: 'confirming',
			confirmations: null,
			requiredConfirmations: null
		},
		submit
	});

	const run = () =>
		executeLiquidiumSupply({
			identity: mockIdentity,
			ethAddress,
			poolId,
			asset: 'BTC',
			amount: 100_000_000n,
			inflowFee: 50n,
			displayAmount: '1',
			progressStep: 'supplying',
			broadcast
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(liquidiumServices.getOrCreateLiquidiumProfile).mockResolvedValue(profileId);
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			lending: { supply }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
		submit.mockResolvedValue({ success: true, txid: '0xhash' });
	});

	it('broadcasts on the native rail, submits the txid and registers the transaction', async () => {
		supply.mockResolvedValue(buildFlow(nativeTarget));
		broadcast.mockResolvedValue('0xhash');

		await run();

		expect(supply).toHaveBeenCalledExactlyOnceWith({ profileId, poolId, action: 'deposit' });
		// Gross transfer = net supply (100_000_000) + provider inflow fee (50).
		expect(broadcast).toHaveBeenCalledExactlyOnceWith({
			target: nativeTarget,
			amount: 100_000_050n
		});
		expect(submit).toHaveBeenCalledExactlyOnceWith({ txid: '0xhash' });

		expect(analyticsServices.trackEvent).toHaveBeenCalledWith({
			name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
			metadata: { dApp: 'liquidium', action: 'supply', token: 'BTC', tokenAmount: '1' }
		});

		expect(createActiveUserTransaction).toHaveBeenCalledOnce();

		const [[{ data, externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(data).toEqual(
			expect.objectContaining({
				Liquidium: expect.objectContaining({
					pool_id: poolId,
					amount: 100_000_000n,
					action: { Supply: null }
				})
			})
		);
		expect(externalRefs).toEqual(
			expect.arrayContaining([
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }
			])
		);
	});

	it('submits and persists a native BTC txid (no 0x prefix)', async () => {
		supply.mockResolvedValue(buildFlow(nativeTarget));
		broadcast.mockResolvedValue('deadbeef');

		await run();

		expect(submit).toHaveBeenCalledExactlyOnceWith({ txid: 'deadbeef' });

		const [[{ externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(externalRefs).toEqual(
			expect.arrayContaining([{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: 'deadbeef' }])
		);
	});

	it('resolves even if post-broadcast bookkeeping fails (funds already sent)', async () => {
		supply.mockResolvedValue(buildFlow(nativeTarget));
		broadcast.mockResolvedValue('0xhash');
		// The transfer is broadcast, but registering the txid / AUT row fails.
		createActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

		await expect(run()).resolves.toBeUndefined();

		// The on-chain transfer still happened; the failure is swallowed.
		expect(broadcast).toHaveBeenCalledOnce();
	});

	it('still registers the AUT row when flow.submit fails (independent best-effort steps)', async () => {
		supply.mockResolvedValue(buildFlow(nativeTarget));
		broadcast.mockResolvedValue('0xhash');
		// The SDK submit (a txid indexing hint) fails after funds were broadcast.
		submit.mockRejectedValueOnce(new Error('rpc hiccup'));

		await expect(run()).resolves.toBeUndefined();

		// The AUT row must still be created so the poller/analytics can correlate by txid.
		expect(createActiveUserTransaction).toHaveBeenCalledOnce();

		const [[{ externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(externalRefs).toEqual(
			expect.arrayContaining([{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }])
		);
	});

	it('rejects an icrcAccount target and registers nothing', async () => {
		supply.mockResolvedValue(
			buildFlow({
				type: 'icrcAccount',
				poolId,
				asset: 'BTC',
				chain: 'BTC',
				action: 'deposit',
				owner: 'aaaaa-aa',
				subaccount: new Uint8Array(),
				account: 'icrc-account-text'
			})
		);

		await expect(run()).rejects.toThrow('unsupported');
		expect(broadcast).not.toHaveBeenCalled();
		expect(createActiveUserTransaction).not.toHaveBeenCalled();
	});
});
