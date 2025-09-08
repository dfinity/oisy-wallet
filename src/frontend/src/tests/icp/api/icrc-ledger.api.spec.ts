import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	allowance,
	approve,
	balance,
	getBlocks,
	metadata,
	transactionFee,
	transfer
} from '$icp/api/icrc-ledger.api';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { getIcrcSubaccount } from '$icp/utils/icrc-account.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import {
	type IcrcAllowance,
	type IcrcGetBlocksResult,
	IcrcLedgerCanister,
	IcrcMetadataResponseEntries,
	type IcrcAccount,
	type IcrcBlockIndex,
	type IcrcTokenMetadataResponse
} from '@dfinity/ledger-icrc';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock('$icp/utils/date.utils', () => ({
	nowInBigIntNanoSeconds: vi.fn()
}));

describe('icrc-ledger.api', () => {
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
	});

	describe('metadata', () => {
		const params = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const mockToken = { ...mockValidIcToken, icon: 'mock-icon' };
		const mockMetadata: IcrcTokenMetadataResponse = [
			[IcrcMetadataResponseEntries.SYMBOL, { Text: mockToken.symbol }],
			[IcrcMetadataResponseEntries.NAME, { Text: mockToken.name }],
			[IcrcMetadataResponseEntries.FEE, { Nat: mockToken.fee }],
			[IcrcMetadataResponseEntries.DECIMALS, { Nat: BigInt(mockToken.decimals) }],
			[IcrcMetadataResponseEntries.LOGO, { Text: mockToken.icon }]
		];

		beforeEach(() => {
			ledgerCanisterMock.metadata.mockResolvedValue(mockMetadata);
		});

		it('successfully calls metadata endpoint', async () => {
			const result = await metadata(params);

			expect(result).toEqual(mockMetadata);

			expect(ledgerCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
		});

		it('successfully calls metadata endpoint as query', async () => {
			const result = await metadata({ ...params, certified: false });

			expect(result).toEqual(mockMetadata);

			expect(ledgerCanisterMock.metadata).toHaveBeenCalledExactlyOnceWith({ certified: false });
		});

		it('throws an error if identity is undefined', async () => {
			await expect(metadata({ ...params, identity: undefined })).rejects.toThrow();
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

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
		});

		it('successfully calls transactionFee endpoint as query', async () => {
			const result = await transactionFee({ ...params, certified: false });

			expect(result).toEqual(fee);

			expect(ledgerCanisterMock.transactionFee).toHaveBeenCalledExactlyOnceWith({
				certified: false
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transactionFee({ ...params, identity: undefined })).rejects.toThrow();
		});
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

			expect(ledgerCanisterMock.balance).toHaveBeenCalledExactlyOnceWith({
				certified: true,
				...account
			});
		});

		it('successfully calls balance endpoint as query', async () => {
			const tokens = await balance({ ...params, certified: false });

			expect(tokens).toEqual(balanceE8s);

			expect(ledgerCanisterMock.balance).toHaveBeenCalledExactlyOnceWith({
				certified: false,
				...account
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(balance({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('transfer', () => {
		const to: IcrcAccount = {
			owner: mockPrincipal2
		};

		const toAccount = {
			owner: mockPrincipal2,
			subaccount: toNullable()
		};

		const amount = 1_000_000n;

		const createdAt = 123_456_789n;

		const params = {
			to,
			amount,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity,
			createdAt
		};

		const mockIndex: IcrcBlockIndex = 123n;

		beforeEach(() => {
			ledgerCanisterMock.transfer.mockResolvedValue(mockIndex);
		});

		it('successfully calls transfer endpoint', async () => {
			const result = await transfer(params);

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith({
				amount,
				to: toAccount,
				created_at_time: createdAt
			});
		});

		it('successfully calls transfer endpoint without createdAt', async () => {
			vi.mocked(nowInBigIntNanoSeconds).mockReturnValue(987_654_321n);

			const result = await transfer({ ...params, createdAt: undefined });

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.transfer).toHaveBeenCalledExactlyOnceWith({
				amount,
				to: toAccount,
				created_at_time: 987_654_321n
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transfer({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('approve', () => {
		const spender: IcrcAccount = {
			owner: mockPrincipal2
		};

		const spenderAccount = {
			owner: mockPrincipal2,
			subaccount: toNullable()
		};

		const amount = 1_000_000n;

		const expiresAt = 456_789n;
		const createdAt = 123_456_789n;

		const params = {
			spender,
			amount,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity,
			expiresAt,
			createdAt
		};

		const mockIndex: IcrcBlockIndex = 123n;

		beforeEach(() => {
			ledgerCanisterMock.approve.mockResolvedValue(mockIndex);
		});

		it('successfully calls approve endpoint', async () => {
			const result = await approve(params);

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.approve).toHaveBeenCalledExactlyOnceWith({
				amount,
				spender: spenderAccount,
				expires_at: expiresAt,
				created_at_time: createdAt
			});
		});

		it('successfully calls approve endpoint without createdAt', async () => {
			vi.mocked(nowInBigIntNanoSeconds).mockReturnValue(987_654_321n);

			const result = await approve({ ...params, createdAt: undefined });

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.approve).toHaveBeenCalledExactlyOnceWith({
				amount,
				spender: spenderAccount,
				expires_at: expiresAt,
				created_at_time: 987_654_321n
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(approve({ ...params, identity: undefined })).rejects.toThrow();
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

		const allowanceResponse: IcrcAllowance = {
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

			expect(ledgerCanisterMock.allowance).toHaveBeenCalledExactlyOnceWith({
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

	describe('getBlocks', () => {
		const params = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity,
			args: []
		};

		const mockTotalBlocks = 123n;
		const mockGetBlocksResponse: IcrcGetBlocksResult = {
			log_length: mockTotalBlocks,
			blocks: [],
			archived_blocks: []
		};

		beforeEach(() => {
			ledgerCanisterMock.getBlocks.mockResolvedValue(mockGetBlocksResponse);
		});

		it('successfully calls getBlocks endpoint', async () => {
			const result = await getBlocks(params);

			expect(result).toEqual(mockGetBlocksResponse);

			expect(ledgerCanisterMock.getBlocks).toHaveBeenCalledExactlyOnceWith({
				certified: true,
				args: params.args
			});
		});

		it('successfully calls getBlocks endpoint as query', async () => {
			const result = await getBlocks({ ...params, certified: false });

			expect(result).toEqual(mockGetBlocksResponse);

			expect(ledgerCanisterMock.getBlocks).toHaveBeenCalledExactlyOnceWith({
				certified: false,
				args: params.args
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(getBlocks({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
