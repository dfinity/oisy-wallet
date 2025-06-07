import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { allowance, balance, transactionFee } from '$icp/api/icrc-ledger.api';
import { getIcrcSubaccount } from '$icp/utils/icrc-account.utils';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import type { Allowance } from '@dfinity/ledger-icp/dist/candid/ledger';
import { IcrcLedgerCanister, type IcrcAccount } from '@dfinity/ledger-icrc';
import { mock } from 'vitest-mock-extended';

describe('icrc-ledger.api', () => {
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
	});

	describe('balance', () => {
		const params = {
			certified: true,
			owner: mockPrincipal,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const balanceE8s = 314_000_000n;

		const account: IcrcAccount = {
			owner: mockPrincipal
		};

		beforeEach(() => {
			ledgerCanisterMock.balance.mockResolvedValue(balanceE8s);
		});

		it('successfully calls balance endpoint', async () => {
			const tokens = await balance(params);

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledWith({
				certified: true,
				...account
			});
		});

		it('successfully calls balance endpoint as query', async () => {
			const tokens = await balance({
				...params,
				certified: false
			});

			expect(tokens).toEqual(balanceE8s);
			expect(ledgerCanisterMock.balance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledWith({
				certified: false,
				...account
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				balance({
					certified: true,
					owner: mockPrincipal,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});

	describe('transactionFee', () => {
		const params = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const fee = 1_000n;

		beforeEach(() => {
			ledgerCanisterMock.transactionFee.mockResolvedValue(fee);
		});

		it('successfully calls transactionFee endpoint', async () => {
			const result = await transactionFee(params);

			expect(result).toEqual(fee);
			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledWith({
				certified: true
			});
		});

		it('successfully calls transactionFee endpoint as query', async () => {
			const result = await transactionFee({
				...params,
				certified: false
			});

			expect(result).toEqual(fee);
			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledWith({
				certified: false
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				transactionFee({
					certified: true,
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});

	describe('allowance', () => {
		// Test principals representing different users
		const ownerPrincipal = mockPrincipal;
		const spenderPrincipal = mockPrincipal2;

		// Test subaccounts for different scenarios
		const ownerSubaccount = new Uint8Array([
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1
		]);
		const spenderSubaccount = new Uint8Array([
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2
		]);

		const baseParams = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const allowanceResponse: Allowance = {
			allowance: 1_000_000n,
			expires_at: []
		};

		beforeEach(() => {
			ledgerCanisterMock.allowance.mockResolvedValue(allowanceResponse);
		});

		it('successfully calls allowance endpoint (certified=true)', async () => {
			const params = {
				...baseParams,
				owner: { owner: ownerPrincipal },
				spender: { owner: spenderPrincipal }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: true,
				account: {
					owner: ownerPrincipal,
					subaccount: []
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: []
				}
			});
		});

		it('successfully calls allowance endpoint as query (certified=false)', async () => {
			const params = {
				...baseParams,
				certified: false,
				owner: { owner: ownerPrincipal },
				spender: { owner: spenderPrincipal }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: false,
				account: {
					owner: ownerPrincipal,
					subaccount: []
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: []
				}
			});
		});

		it('successfully calls allowance endpoint with spender subaccount only', async () => {
			const params = {
				...baseParams,
				owner: { owner: ownerPrincipal },
				spender: { owner: spenderPrincipal, subaccount: spenderSubaccount }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: true,
				account: {
					owner: ownerPrincipal,
					subaccount: []
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: [spenderSubaccount]
				}
			});
		});

		it('successfully calls allowance endpoint with owner subaccount only', async () => {
			const params = {
				...baseParams,
				owner: { owner: ownerPrincipal, subaccount: ownerSubaccount },
				spender: { owner: spenderPrincipal }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: true,
				account: {
					owner: ownerPrincipal,
					subaccount: [ownerSubaccount]
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: []
				}
			});
		});

		it('successfully calls allowance endpoint with subaccounts', async () => {
			const params = {
				...baseParams,
				owner: { owner: ownerPrincipal, subaccount: ownerSubaccount },
				spender: { owner: spenderPrincipal, subaccount: spenderSubaccount }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: true,
				account: {
					owner: ownerPrincipal,
					subaccount: [ownerSubaccount]
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: [spenderSubaccount]
				}
			});
		});

		it('successfully calls allowance endpoint with subaccounts deriving sub-account from principal', async () => {
			const generatedOwnerSubaccount = getIcrcSubaccount(ownerPrincipal);
			const generatedSpenderSubaccount = getIcrcSubaccount(spenderPrincipal);

			const params = {
				...baseParams,
				owner: { owner: ownerPrincipal, subaccount: generatedOwnerSubaccount },
				spender: { owner: spenderPrincipal, subaccount: generatedSpenderSubaccount }
			};

			const result = await allowance(params);

			expect(result).toEqual(allowanceResponse);
			expect(ledgerCanisterMock.allowance).toHaveBeenCalledTimes(1);

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledWith({
				certified: true,
				account: {
					owner: ownerPrincipal,
					subaccount: [generatedOwnerSubaccount]
				},
				spender: {
					owner: spenderPrincipal,
					subaccount: [generatedSpenderSubaccount]
				}
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(
				allowance({
					certified: true,
					owner: { owner: ownerPrincipal },
					spender: { owner: spenderPrincipal },
					ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
					identity: undefined
				})
			).rejects.toThrow();
		});
	});
});
