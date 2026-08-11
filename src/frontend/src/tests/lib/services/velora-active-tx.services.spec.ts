import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import en from '$lib/i18n/en.json';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	pollVeloraActiveUserTransactions,
	resetVeloraReplacementObservations
} from '$lib/services/velora-active-tx.services';
import { VELORA_EXTERNAL_REF_KEYS, type VeloraExternalRefKey } from '$lib/types/velora-swap';
import {
	mockVeloraActiveUserTransaction,
	mockVeloraData
} from '$tests/mocks/active-user-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type * as VeloraSdk from '@velora-dex/sdk';
import { constructSimpleSDK } from '@velora-dex/sdk';

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

// Only the SDK factory is faked — `OrderHelpers`, which the Delta status mapper
// partitions on, must stay real.
vi.mock('@velora-dex/sdk', async (importOriginal) => ({
	...(await importOriginal<typeof VeloraSdk>()),
	constructSimpleSDK: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

describe('velora-active-tx.services', () => {
	const applySpy = vi.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate');

	const buildTx = ({
		mode,
		refs,
		status = { Pending: null },
		id = mockVeloraActiveUserTransaction.id
	}: {
		mode: 'Delta' | 'Market';
		refs: Partial<Record<VeloraExternalRefKey, string>>;
		status?: ActiveUserTransaction['status'];
		id?: string;
	}): ActiveUserTransaction => ({
		...mockVeloraActiveUserTransaction,
		id,
		status,
		data: {
			Velora: { ...mockVeloraData, mode: mode === 'Delta' ? { Delta: null } : { Market: null } }
		},
		external_refs: Object.entries(refs).map(([key, value]) => ({ key, value }))
	});

	const deltaRefs = {
		[VELORA_EXTERNAL_REF_KEYS.AUCTION_ID]: 'auction-1',
		[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: '1'
	};

	const marketRefs = {
		[VELORA_EXTERNAL_REF_KEYS.TX_HASH]: '0xhash',
		[VELORA_EXTERNAL_REF_KEYS.TX_NONCE]: '5',
		[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: '1'
	};

	let getDeltaOrderById: ReturnType<typeof vi.fn>;
	let getTransactionReceipt: ReturnType<typeof vi.fn>;
	let getTransactionCountLatest: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetVeloraReplacementObservations();

		applySpy.mockResolvedValue();

		getDeltaOrderById = vi.fn();
		vi.mocked(constructSimpleSDK).mockReturnValue({
			delta: { getDeltaOrderById }
		} as unknown as ReturnType<typeof constructSimpleSDK>);

		getTransactionReceipt = vi.fn();
		getTransactionCountLatest = vi.fn();
		vi.mocked(infuraProviders).mockReturnValue({
			getTransactionReceipt,
			getTransactionCountLatest
		} as unknown as ReturnType<typeof infuraProviders>);
	});

	it('does nothing for an empty list', async () => {
		await pollVeloraActiveUserTransactions({
			identity: mockIdentity,
			transactions: [],
			userAddress: mockEthAddress
		});

		expect(constructSimpleSDK).not.toHaveBeenCalled();
		expect(infuraProviders).not.toHaveBeenCalled();
		expect(applySpy).not.toHaveBeenCalled();
	});

	describe('Delta', () => {
		it('skips a row without an auction id', async () => {
			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [
					buildTx({ mode: 'Delta', refs: { [VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: '1' } })
				],
				userAddress: mockEthAddress
			});

			expect(getDeltaOrderById).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('constructs the SDK for the stored chain and reads the stored auction', async () => {
			getDeltaOrderById.mockResolvedValue({ status: 'ACTIVE', transactions: [], refunds: [] });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: mockEthAddress
			});

			expect(constructSimpleSDK).toHaveBeenCalledWith(expect.objectContaining({ chainId: 1 }));
			expect(getDeltaOrderById).toHaveBeenCalledExactlyOnceWith('auction-1');
		});

		it('advances a pending row to Executing', async () => {
			getDeltaOrderById.mockResolvedValue({ status: 'ACTIVE', transactions: [], refunds: [] });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Executing: null } })
				})
			);
		});

		it('terminalizes a completed order and persists the settlement hashes', async () => {
			getDeltaOrderById.mockResolvedValue({
				status: 'COMPLETED',
				transactions: [{ originTx: '0xorigin', destinationTx: '0xdestination' }],
				refunds: []
			});

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Succeeded: null },
						externalRefs: expect.arrayContaining([
							{ key: VELORA_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH, value: '0xorigin' },
							{ key: VELORA_EXTERNAL_REF_KEYS.DEST_TX_HASH, value: '0xdestination' }
						])
					})
				})
			);
		});

		it('terminalizes a refunded order with the refund error text', async () => {
			getDeltaOrderById.mockResolvedValue({
				status: 'REFUNDED',
				transactions: [],
				refunds: [{ tx: '0xrefund', chainId: 1, token: '0xtoken', amount: '1' }]
			});

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Failed: null },
						error: en.swap.error.swap_refunded,
						externalRefs: expect.arrayContaining([
							{ key: VELORA_EXTERNAL_REF_KEYS.REFUND_TX_HASH, value: '0xrefund' }
						])
					})
				})
			);
		});

		it('leaves the row untouched on an unrecognised status', async () => {
			getDeltaOrderById.mockResolvedValue({
				status: 'SOMETHING_NEW',
				transactions: [],
				refunds: []
			});

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('writes newly-learned hashes even when the status does not advance', async () => {
			getDeltaOrderById.mockResolvedValue({
				status: 'ACTIVE',
				transactions: [{ originTx: '0xorigin', destinationTx: null }],
				refunds: []
			});

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs, status: { Executing: null } })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						externalRefs: expect.arrayContaining([
							{ key: VELORA_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH, value: '0xorigin' }
						])
					})
				})
			);
			expect(applySpy.mock.calls[0][0].update).not.toHaveProperty('status');
		});

		it('does not write when nothing changed', async () => {
			getDeltaOrderById.mockResolvedValue({ status: 'ACTIVE', transactions: [], refunds: [] });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs, status: { Executing: null } })],
				userAddress: mockEthAddress
			});

			expect(applySpy).not.toHaveBeenCalled();
		});

		it('polls Delta rows even without an EVM address', async () => {
			getDeltaOrderById.mockResolvedValue({ status: 'ACTIVE', transactions: [], refunds: [] });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Delta', refs: deltaRefs })],
				userAddress: undefined
			});

			expect(getDeltaOrderById).toHaveBeenCalledOnce();
		});
	});

	describe('Market', () => {
		it('skips a row without a hash or nonce', async () => {
			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [
					buildTx({ mode: 'Market', refs: { [VELORA_EXTERNAL_REF_KEYS.CHAIN_ID]: '1' } })
				],
				userAddress: mockEthAddress
			});

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('skips Market rows when the EVM address is unavailable', async () => {
			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
				userAddress: null
			});

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('resolves the provider from the stored chain id', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 1 });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
				userAddress: mockEthAddress
			});

			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
		});

		it('terminalizes a mined transaction as Succeeded', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 1 });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Succeeded: null } })
				})
			);
			expect(getTransactionCountLatest).not.toHaveBeenCalled();
		});

		it('terminalizes a reverted transaction as Failed', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 0 });

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Failed: null },
						error: en.swap.error.failed_unexpectedly
					})
				})
			);
		});

		it('keeps a still-unmined transaction Executing', async () => {
			getTransactionReceipt.mockResolvedValue(null);
			getTransactionCountLatest.mockResolvedValue(5);

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
				userAddress: mockEthAddress
			});

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Executing: null } })
				})
			);
		});

		describe('replacement rule', () => {
			it('does not terminalize on a single replaced observation', async () => {
				getTransactionReceipt.mockResolvedValue(null);
				getTransactionCountLatest.mockResolvedValue(6);

				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
					userAddress: mockEthAddress
				});

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Executing: null } })
					})
				);
			});

			it('terminalizes as Failed on the second consecutive replaced observation', async () => {
				getTransactionReceipt.mockResolvedValue(null);
				getTransactionCountLatest.mockResolvedValue(6);

				const tx = buildTx({ mode: 'Market', refs: marketRefs, status: { Executing: null } });

				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [tx],
					userAddress: mockEthAddress
				});
				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [tx],
					userAddress: mockEthAddress
				});

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({
							status: { Failed: null },
							error: en.swap.error.swap_replaced_or_dropped
						})
					})
				);
			});

			it('does not produce a false Failed when the receipt merely lands late', async () => {
				// The nonce read races our own confirmation: the re-read finds the receipt.
				getTransactionReceipt.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 1 });
				getTransactionCountLatest.mockResolvedValue(6);

				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [buildTx({ mode: 'Market', refs: marketRefs })],
					userAddress: mockEthAddress
				});

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Succeeded: null } })
					})
				);
			});

			it('resets the count when the row stops looking replaced', async () => {
				const tx = buildTx({ mode: 'Market', refs: marketRefs, status: { Executing: null } });

				getTransactionReceipt.mockResolvedValue(null);
				getTransactionCountLatest.mockResolvedValue(6);
				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [tx],
					userAddress: mockEthAddress
				});

				// A healthy tick in between must clear the evidence.
				getTransactionCountLatest.mockResolvedValue(5);
				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [tx],
					userAddress: mockEthAddress
				});

				getTransactionCountLatest.mockResolvedValue(6);
				await pollVeloraActiveUserTransactions({
					identity: mockIdentity,
					transactions: [tx],
					userAddress: mockEthAddress
				});

				expect(applySpy).not.toHaveBeenCalled();
			});
		});

		it('reads the confirmed nonce once for several rows on the same chain', async () => {
			getTransactionReceipt.mockResolvedValue(null);
			getTransactionCountLatest.mockResolvedValue(5);

			await pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [
					buildTx({ mode: 'Market', refs: marketRefs, id: 'row-a' }),
					buildTx({
						mode: 'Market',
						refs: { ...marketRefs, [VELORA_EXTERNAL_REF_KEYS.TX_HASH]: '0xhash2' },
						id: 'row-b'
					})
				],
				userAddress: mockEthAddress
			});

			expect(getTransactionReceipt).toHaveBeenCalledTimes(2);
			expect(getTransactionCountLatest).toHaveBeenCalledOnce();
		});
	});

	it('isolates a failing row from the rest of the batch', async () => {
		getDeltaOrderById.mockRejectedValue(new Error('velora down'));
		getTransactionReceipt.mockResolvedValue({ status: 1 });

		await expect(
			pollVeloraActiveUserTransactions({
				identity: mockIdentity,
				transactions: [
					buildTx({ mode: 'Delta', refs: deltaRefs, id: 'row-delta' }),
					buildTx({ mode: 'Market', refs: marketRefs, id: 'row-market' })
				],
				userAddress: mockEthAddress
			})
		).resolves.toBeUndefined();

		expect(applySpy).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				update: expect.objectContaining({ status: { Succeeded: null } })
			})
		);
	});
});
