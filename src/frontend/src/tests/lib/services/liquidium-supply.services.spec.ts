import { BtcBroadcastUnconfirmedError } from '$btc/types/btc-send';
import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import {
	estimateLiquidiumInflowFee,
	executeLiquidiumSupply
} from '$lib/services/liquidium-supply.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import { LiquidiumSolTransferRefusedError } from '$lib/types/errors';
import {
	LIQUIDIUM_EXTERNAL_REF_KEYS,
	type LiquidiumSolBlockhash
} from '$lib/types/liquidium-active-tx';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { nonNullish } from '@dfinity/utils';
import type { LiquidiumClient, SupplyFlow, SupplyTarget } from '@liquidium/client';
import { mockDeep } from 'vitest-mock-extended';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/liquidium.services', () => ({ getOrCreateLiquidiumProfile: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteUnbroadcastActiveUserTransaction: vi.fn()
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

	const nativeTarget: SupplyTarget = {
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
			chain: 'BTC',
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

		expect(supply).toHaveBeenCalledExactlyOnceWith({
			profileId,
			poolId,
			chain: 'BTC',
			action: 'deposit'
		});
		// Gross transfer = net supply (100_000_000) + provider inflow fee (50).
		expect(broadcast).toHaveBeenCalledExactlyOnceWith({
			target: nativeTarget,
			amount: 100_000_050n,
			beforeBroadcast: expect.any(Function)
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
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.CHAIN, value: 'BTC' },
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

	describe('when the transport knows the txid before broadcasting', () => {
		const sent = vi.fn();
		const deleteUnbroadcastActiveUserTransaction = vi.mocked(
			activeUserTransactionsServices.deleteUnbroadcastActiveUserTransaction
		);

		// As the BTC wizard's `sendBtc` does through the backend: `beforeBroadcast` once signed, then
		// the broadcast, which either goes out or fails with `failure`.
		const broadcastThroughBackend = (failure?: unknown) =>
			broadcast.mockImplementation(
				async ({
					beforeBroadcast
				}: {
					beforeBroadcast: (params: { txid: string }) => Promise<void>;
				}) => {
					await beforeBroadcast({ txid: '0xhash' });

					sent();

					if (nonNullish(failure)) {
						throw failure;
					}

					return '0xhash';
				}
			);

		const rowId = () => createActiveUserTransaction.mock.calls[0]?.[0].id;

		beforeEach(() => {
			sent.mockClear();
			supply.mockResolvedValue(buildFlow(nativeTarget));
			deleteUnbroadcastActiveUserTransaction.mockResolvedValue(undefined);
		});

		it('records the supply with its txid before the broadcast, and only once', async () => {
			createActiveUserTransaction.mockImplementation(() => {
				expect(sent).not.toHaveBeenCalled();

				return Promise.resolve(mockActiveUserTransaction);
			});
			broadcastThroughBackend();

			await run();

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
			expect(createActiveUserTransaction.mock.calls[0][0].externalRefs).toEqual(
				expect.arrayContaining([{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }])
			);
			expect(submit).toHaveBeenCalledExactlyOnceWith({ txid: '0xhash' });
		});

		it('broadcasts nothing when the row cannot be written, and deletes it all the same', async () => {
			createActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));
			broadcastThroughBackend();

			await expect(run()).rejects.toThrow('backend unavailable');

			expect(sent).not.toHaveBeenCalled();
			expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: rowId()
			});
			expect(submit).not.toHaveBeenCalled();
		});

		it('deletes the row when the broadcast is refused outright', async () => {
			const refusal = new BtcBroadcastTransactionCanisterError({ FeeTooLow: null }, 'fee');
			broadcastThroughBackend(refusal);

			await expect(run()).rejects.toBe(refusal);

			expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: rowId()
			});
			expect(submit).not.toHaveBeenCalled();
		});

		it('keeps the row when the transfer may have gone out', async () => {
			const unclear = new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') });
			broadcastThroughBackend(unclear);

			await expect(run()).rejects.toBe(unclear);

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
			expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			expect(submit).not.toHaveBeenCalled();
		});
	});

	describe('a native SOL transfer', () => {
		const solBlockhash: LiquidiumSolBlockhash = { blockhash: 'blockhash-1', slot: 42n };
		const signature = 'sol-signature';
		const deleteUnbroadcastActiveUserTransaction = vi.mocked(
			activeUserTransactionsServices.deleteUnbroadcastActiveUserTransaction
		);

		// As `sendLiquidiumSol` does: `beforeBroadcast` with the blockhash and its valid slot, then the
		// broadcast, which either goes out or fails with `failure`.
		const broadcastSol = (failure?: unknown) =>
			broadcast.mockImplementation(
				async ({
					beforeBroadcast
				}: {
					beforeBroadcast: (params: {
						txid: string;
						solBlockhash?: LiquidiumSolBlockhash;
					}) => Promise<void>;
				}) => {
					await beforeBroadcast({ txid: signature, solBlockhash });

					if (nonNullish(failure)) {
						throw failure;
					}

					return signature;
				}
			);

		const runSol = () =>
			executeLiquidiumSupply({
				identity: mockIdentity,
				ethAddress,
				poolId: 'pool-sol',
				chain: 'SOL',
				asset: 'SOL',
				amount: 30_000_000n,
				inflowFee: 1_884_122n,
				displayAmount: '0.03',
				progressStep: 'supplying',
				broadcast
			});

		const rowId = () => createActiveUserTransaction.mock.calls[0]?.[0].id;

		beforeEach(() => {
			supply.mockResolvedValue(
				buildFlow({
					poolId: 'pool-sol',
					asset: 'SOL',
					chain: 'SOL',
					action: 'deposit',
					address: 'GXVewvv6HehcLFYCmwpqh5CrMjqN9zJ8rqzGq3HEt9Ax'
				})
			);
			deleteUnbroadcastActiveUserTransaction.mockResolvedValue(undefined);
		});

		it('records the chain, the signature, the blockhash and its valid slot before the broadcast', async () => {
			broadcastSol();

			await runSol();

			expect(broadcast).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 30_000_000n + 1_884_122n })
			);
			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
			expect(createActiveUserTransaction.mock.calls[0][0].externalRefs).toEqual(
				expect.arrayContaining([
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.CHAIN, value: 'SOL' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: signature },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.SOL_BLOCKHASH, value: 'blockhash-1' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.SOL_BLOCKHASH_SLOT, value: '42' }
				])
			);
			expect(submit).toHaveBeenCalledExactlyOnceWith({ txid: signature });
		});

		it('deletes the row of a transfer that was never sent', async () => {
			const refused = new LiquidiumSolTransferRefusedError({ cause: new Error('preflight') });
			broadcastSol(refused);

			await expect(runSol()).rejects.toBe(refused);

			expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: rowId()
			});
			expect(submit).not.toHaveBeenCalled();
		});

		it('keeps the row when the SOL may have left', async () => {
			const unclear = new Error('confirmation timed out');
			broadcastSol(unclear);

			await expect(runSol()).rejects.toBe(unclear);

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
			expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			expect(submit).not.toHaveBeenCalled();
		});
	});

	describe('estimateLiquidiumInflowFee', () => {
		const client = mockDeep<LiquidiumClient>();
		const { estimateInflowFee } = client.lending;
		const getOrCreateLiquidiumProfile = vi.mocked(liquidiumServices.getOrCreateLiquidiumProfile);

		beforeEach(() => {
			vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue(client);
			estimateInflowFee.mockResolvedValue({ totalFee: 500n });
		});

		it('quotes other assets by asset and chain alone, without the profile', async () => {
			await expect(
				estimateLiquidiumInflowFee({
					identity: mockIdentity,
					ethAddress,
					asset: 'BTC',
					chain: 'ICP',
					poolId,
					action: 'deposit'
				})
			).resolves.toEqual({ totalFee: 500n });

			expect(estimateInflowFee).toHaveBeenCalledExactlyOnceWith({ asset: 'BTC', chain: 'ICP' });
			expect(getOrCreateLiquidiumProfile).not.toHaveBeenCalled();
		});

		it('quotes SOL with the profile, the pool and what the inflow is for', async () => {
			await expect(
				estimateLiquidiumInflowFee({
					identity: mockIdentity,
					ethAddress,
					asset: 'SOL',
					chain: 'ICP',
					poolId: 'pool-sol',
					action: 'repayment'
				})
			).resolves.toEqual({ totalFee: 500n });

			expect(getOrCreateLiquidiumProfile).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ethAddress
			});
			expect(estimateInflowFee).toHaveBeenCalledExactlyOnceWith({
				asset: 'SOL',
				chain: 'ICP',
				poolId: 'pool-sol',
				action: 'repayment',
				profileId
			});
		});

		it('does not quote SOL without the Ethereum address that owns the profile', async () => {
			await expect(
				estimateLiquidiumInflowFee({
					identity: mockIdentity,
					ethAddress: undefined,
					asset: 'SOL',
					chain: 'ICP',
					poolId: 'pool-sol',
					action: 'deposit'
				})
			).rejects.toThrow();

			expect(getOrCreateLiquidiumProfile).not.toHaveBeenCalled();
			expect(estimateInflowFee).not.toHaveBeenCalled();
		});
	});
});
