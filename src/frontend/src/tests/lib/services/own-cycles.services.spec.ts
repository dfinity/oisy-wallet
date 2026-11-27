import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as icrcIndexNgApi from '$icp/api/icrc-index-ng.api';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { BACKEND_CANISTER_PRINCIPAL, SIGNER_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import {
	loadFreeAllowance,
	loadOwnCycles,
	loadPreviousSpendingLimit,
	setSpendingLimit
} from '$lib/services/own-cycles.services';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

describe('own-cycles.services', () => {
	const signer = { owner: Principal.fromText(SIGNER_CANISTER_ID) };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadFreeAllowance', () => {
		beforeEach(() => {
			vi.spyOn(icrcLedgerApi, 'allowance').mockResolvedValue({
				allowance: 2_430_000_000_000n,
				expires_at: []
			});
		});

		it('returns what is left of the OISY allowance', async () => {
			await expect(loadFreeAllowance({ identity: mockIdentity })).resolves.toBe(2_430_000_000_000n);
		});

		// As the backend keys it: its main account approves the signer, with the user's ICP account
		// identifier as the spender's subaccount.
		it('reads the backend’s approval to the signer for the user, with a query', async () => {
			await loadFreeAllowance({ identity: mockIdentity });

			expect(icrcLedgerApi.allowance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: false,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				owner: { owner: BACKEND_CANISTER_PRINCIPAL },
				spender: {
					owner: Principal.fromText(SIGNER_CANISTER_ID),
					subaccount: AccountIdentifier.fromPrincipal({ principal: mockPrincipal }).toUint8Array()
				}
			});
		});

		it('reads it certified when asked', async () => {
			await loadFreeAllowance({ identity: mockIdentity, certified: true });

			expect(icrcLedgerApi.allowance).toHaveBeenCalledWith(
				expect.objectContaining({ certified: true })
			);
		});

		it('throws without an identity', async () => {
			await expect(loadFreeAllowance({ identity: undefined })).rejects.toThrow();

			expect(icrcLedgerApi.allowance).not.toHaveBeenCalled();
		});
	});

	describe('loadOwnCycles', () => {
		beforeEach(() => {
			vi.spyOn(icrcLedgerApi, 'allowance').mockResolvedValue({
				allowance: 2_000_000_000_000n,
				expires_at: []
			});
			vi.spyOn(icrcLedgerApi, 'balance').mockResolvedValue(5_000_000_000_000n);
		});

		it('returns the approval left for the signer and the TCYCLES balance', async () => {
			await expect(loadOwnCycles({ identity: mockIdentity })).resolves.toEqual({
				approved: 2_000_000_000_000n,
				balance: 5_000_000_000_000n
			});
		});

		it('reads both from the cycles ledger with queries, for the main accounts', async () => {
			await loadOwnCycles({ identity: mockIdentity });

			expect(icrcLedgerApi.allowance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: false,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				owner: { owner: mockPrincipal },
				spender: signer
			});
			expect(icrcLedgerApi.balance).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				certified: false,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				owner: mockPrincipal
			});
		});

		it('reads both certified when asked', async () => {
			await loadOwnCycles({ identity: mockIdentity, certified: true });

			expect(icrcLedgerApi.allowance).toHaveBeenCalledWith(
				expect.objectContaining({ certified: true })
			);
			expect(icrcLedgerApi.balance).toHaveBeenCalledWith(
				expect.objectContaining({ certified: true })
			);
		});

		it('throws without an identity', async () => {
			await expect(loadOwnCycles({ identity: undefined })).rejects.toThrow();

			expect(icrcLedgerApi.allowance).not.toHaveBeenCalled();
			expect(icrcLedgerApi.balance).not.toHaveBeenCalled();
		});

		it('throws when a read fails', async () => {
			const err = new Error('Ledger unreachable');

			vi.spyOn(icrcLedgerApi, 'balance').mockRejectedValue(err);

			await expect(loadOwnCycles({ identity: mockIdentity })).rejects.toThrow(err);
		});
	});

	describe('loadPreviousSpendingLimit', () => {
		const indexCanisterId = 'ul4oc-4iaaa-aaaaq-qaabq-cai';

		const transaction = ({
			id,
			approve
		}: {
			id: bigint;
			approve?: Partial<IcrcIndexDid.Approve>;
		}): IcrcIndexDid.TransactionWithId => ({
			id,
			transaction: {
				kind: approve === undefined ? 'transfer' : 'approve',
				timestamp: id,
				burn: [],
				mint: [],
				transfer: [],
				fee_collector: [],
				approve:
					approve === undefined
						? []
						: [
								{
									fee: [],
									memo: [],
									created_at_time: [],
									expected_allowance: [],
									expires_at: [],
									from: { owner: mockPrincipal, subaccount: [] },
									spender: { owner: signer.owner, subaccount: [] },
									amount: ZERO,
									...approve
								}
							]
			}
		});

		// Other transactions, newest first, from `newest` down.
		const others = ({ newest, count }: { newest: bigint; count: number }) =>
			Array.from({ length: count }, (_, i) => transaction({ id: newest - BigInt(i) }));

		const page = ({
			transactions,
			oldest = ZERO
		}: {
			transactions: IcrcIndexDid.TransactionWithId[];
			oldest?: bigint;
		}): IcrcIndexDid.GetTransactions => ({
			balance: ZERO,
			transactions,
			oldest_tx_id: [oldest]
		});

		it('returns the amount of the last approval to the signer, read with a query', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue(
				page({
					transactions: [
						transaction({ id: 9n }),
						transaction({ id: 8n, approve: { amount: 2_000_000_000_000n } }),
						transaction({ id: 5n, approve: { amount: 1_000_000_000_000n } })
					]
				})
			);

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBe(2_000_000_000_000n);

			expect(icrcIndexNgApi.getTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				owner: mockPrincipal,
				indexCanisterId,
				start: undefined,
				maxResults: 100n,
				certified: false
			});
		});

		it('skips approvals to others, from a subaccount or to a signer subaccount', async () => {
			const subaccount: [Uint8Array] = [new Uint8Array(32).fill(1)];

			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue(
				page({
					transactions: [
						transaction({
							id: 9n,
							approve: { amount: 1n, spender: { owner: mockPrincipal, subaccount: [] } }
						}),
						transaction({
							id: 8n,
							approve: { amount: 2n, from: { owner: mockPrincipal, subaccount } }
						}),
						transaction({
							id: 7n,
							approve: { amount: 3n, spender: { owner: signer.owner, subaccount } }
						}),
						transaction({ id: 6n, approve: { amount: 4n } })
					]
				})
			);

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBe(4n);
		});

		it('counts an all-zero subaccount as the main account', async () => {
			const zeros: [Uint8Array] = [new Uint8Array(32)];

			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue(
				page({
					transactions: [
						transaction({
							id: 9n,
							approve: {
								amount: 5n,
								from: { owner: mockPrincipal, subaccount: zeros },
								spender: { owner: signer.owner, subaccount: zeros }
							}
						})
					]
				})
			);

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBe(5n);
		});

		it('pages back through the history until it finds one', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions')
				.mockResolvedValueOnce(page({ transactions: others({ newest: 300n, count: 100 }) }))
				.mockResolvedValueOnce(
					page({ transactions: [transaction({ id: 150n, approve: { amount: 6n } })] })
				);

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBe(6n);

			expect(icrcIndexNgApi.getTransactions).toHaveBeenCalledTimes(2);
			expect(icrcIndexNgApi.getTransactions).toHaveBeenLastCalledWith(
				expect.objectContaining({ start: 201n })
			);
		});

		it('returns undefined when the history holds none', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue(
				page({ transactions: others({ newest: 3n, count: 3 }), oldest: 1n })
			);

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBeUndefined();

			expect(icrcIndexNgApi.getTransactions).toHaveBeenCalledOnce();
		});

		it('returns undefined for an empty history', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue({
				balance: ZERO,
				transactions: [],
				oldest_tx_id: []
			});

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBeUndefined();
		});

		it('stops after 5 pages', async () => {
			let newest = 1_000n;

			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockImplementation(() => {
				const transactions = others({ newest, count: 100 });

				newest -= 100n;

				return Promise.resolve(page({ transactions }));
			});

			await expect(
				loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId })
			).resolves.toBeUndefined();

			expect(icrcIndexNgApi.getTransactions).toHaveBeenCalledTimes(5);
		});

		it('reads certified when asked', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions').mockResolvedValue(page({ transactions: [] }));

			await loadPreviousSpendingLimit({ identity: mockIdentity, indexCanisterId, certified: true });

			expect(icrcIndexNgApi.getTransactions).toHaveBeenCalledWith(
				expect.objectContaining({ certified: true })
			);
		});

		it('throws without an identity', async () => {
			vi.spyOn(icrcIndexNgApi, 'getTransactions');

			await expect(
				loadPreviousSpendingLimit({ identity: undefined, indexCanisterId })
			).rejects.toThrow();

			expect(icrcIndexNgApi.getTransactions).not.toHaveBeenCalled();
		});
	});

	describe('setSpendingLimit', () => {
		beforeEach(() => {
			vi.spyOn(icrcLedgerApi, 'approve').mockResolvedValue(1n);
		});

		it('sets the approval to the new limit, stating the one it replaces, with no expiry', async () => {
			await setSpendingLimit({
				identity: mockIdentity,
				approved: 2_000_000_000_000n,
				limit: 1_500_000_000_000n
			});

			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
				spender: signer,
				amount: 1_500_000_000_000n,
				expectedAllowance: 2_000_000_000_000n
			});
		});

		it('revokes the limit with 0', async () => {
			await setSpendingLimit({ identity: mockIdentity, approved: 2_000_000_000_000n, limit: ZERO });

			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ amount: ZERO, expectedAllowance: 2_000_000_000_000n })
			);
		});

		it('states a zero approval when none is left', async () => {
			await setSpendingLimit({ identity: mockIdentity, approved: ZERO, limit: 1_000_000_000_000n });

			expect(icrcLedgerApi.approve).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ amount: 1_000_000_000_000n, expectedAllowance: ZERO })
			);
		});

		it('throws when the ledger refuses the approval', async () => {
			const err = new Error('Allowance changed');

			vi.spyOn(icrcLedgerApi, 'approve').mockRejectedValue(err);

			await expect(
				setSpendingLimit({ identity: mockIdentity, approved: 1n, limit: 1_000_000_000_000n })
			).rejects.toThrow(err);
		});
	});
});
