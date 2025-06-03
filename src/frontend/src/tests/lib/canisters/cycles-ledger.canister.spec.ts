import type {
	Account,
	Allowance,
	AllowanceArgs,
	ApproveArgs,
	CreateCanisterArgs,
	_SERVICE as CyclesLedgerService,
	DataCertificate,
	DepositArgs,
	DepositResult,
	GetArchivesArgs,
	GetArchivesResult,
	GetBlocksArgs,
	GetBlocksResult,
	MetadataValue,
	SupportedBlockType,
	SupportedStandard,
	TransferArgs,
	TransferFromArgs,
	Value,
	WithdrawArgs,
	WithdrawFromArgs
} from '$declarations/cycles_ledger/cycles_ledger.did';
import { CyclesLedgerCanister } from '$lib/canisters/cycles-ledger.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('cycles-ledger.canister', () => {
	const createCyclesLedgerCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<CyclesLedgerService>,
		'serviceOverride'
	>): Promise<CyclesLedgerCanister> =>
		CyclesLedgerCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<CyclesLedgerService>>();
	const mockResponseError = new Error('Test response error');

	const testAccount: Account = {
		owner: mockPrincipal,
		subaccount: []
	};

	const testSpender: Account = {
		owner: Principal.fromText('aaaaa-aa'),
		subaccount: []
	};

	const transferArgs: TransferArgs = {
		to: testAccount,
		amount: BigInt(1000),
		fee: [],
		memo: [],
		from_subaccount: [],
		created_at_time: []
	};

	const approveArgs: ApproveArgs = {
		spender: testSpender,
		amount: BigInt(1000),
		fee: [],
		memo: [],
		from_subaccount: [],
		created_at_time: [],
		expected_allowance: [],
		expires_at: []
	};

	const allowanceArgs: AllowanceArgs = {
		account: testAccount,
		spender: testSpender
	};

	const queryParams = {
		certified: false
	};

	const errorResponse = { Err: { InsufficientFunds: { balance: BigInt(100) } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('icrc1BalanceOf', () => {
		it('returns correct balance', async () => {
			const expectedBalance = BigInt(1000);
			service.icrc1_balance_of.mockResolvedValue(expectedBalance);

			const { icrc1BalanceOf } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1BalanceOf({ account: testAccount });

			expect(res).toEqual(expectedBalance);
			expect(service.icrc1_balance_of).toHaveBeenCalledWith(testAccount);
		});

		it('should throw an error if icrc1_balance_of throws', async () => {
			service.icrc1_balance_of.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1BalanceOf } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1BalanceOf({ account: testAccount });

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Decimals', () => {
		it('returns correct decimals', async () => {
			const expectedDecimals = 8;
			service.icrc1_decimals.mockResolvedValue(expectedDecimals);

			const { icrc1Decimals } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Decimals(queryParams);

			expect(res).toEqual(expectedDecimals);
			expect(service.icrc1_decimals).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_decimals throws', async () => {
			service.icrc1_decimals.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Decimals } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Decimals(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Fee', () => {
		it('returns correct fee', async () => {
			const expectedFee = BigInt(10000);
			service.icrc1_fee.mockResolvedValue(expectedFee);

			const { icrc1Fee } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Fee(queryParams);

			expect(res).toEqual(expectedFee);
			expect(service.icrc1_fee).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_fee throws', async () => {
			service.icrc1_fee.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Fee } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Fee(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Metadata', () => {
		it('returns correct metadata', async () => {
			const expectedMetadata: Array<[string, MetadataValue]> = [
				['name', { Text: 'Cycles Token' }],
				['symbol', { Text: 'CYC' }]
			];
			service.icrc1_metadata.mockResolvedValue(expectedMetadata);

			const { icrc1Metadata } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Metadata(queryParams);

			expect(res).toEqual(expectedMetadata);
			expect(service.icrc1_metadata).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_metadata throws', async () => {
			service.icrc1_metadata.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Metadata } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Metadata(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1MintingAccount', () => {
		it('returns correct minting account', async () => {
			const expectedAccount: [Account] = [testAccount];
			service.icrc1_minting_account.mockResolvedValue(expectedAccount);

			const { icrc1MintingAccount } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1MintingAccount(queryParams);

			expect(res).toEqual(expectedAccount);
			expect(service.icrc1_minting_account).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_minting_account throws', async () => {
			service.icrc1_minting_account.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1MintingAccount } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1MintingAccount(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Name', () => {
		it('returns correct name', async () => {
			const expectedName = 'Cycles Token';
			service.icrc1_name.mockResolvedValue(expectedName);

			const { icrc1Name } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Name(queryParams);

			expect(res).toEqual(expectedName);
			expect(service.icrc1_name).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_name throws', async () => {
			service.icrc1_name.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Name } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Name(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Symbol', () => {
		it('returns correct symbol', async () => {
			const expectedSymbol = 'CYC';
			service.icrc1_symbol.mockResolvedValue(expectedSymbol);

			const { icrc1Symbol } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Symbol(queryParams);

			expect(res).toEqual(expectedSymbol);
			expect(service.icrc1_symbol).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_symbol throws', async () => {
			service.icrc1_symbol.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Symbol } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Symbol(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1TotalSupply', () => {
		it('returns correct total supply', async () => {
			const expectedSupply = BigInt(1000000000);
			service.icrc1_total_supply.mockResolvedValue(expectedSupply);

			const { icrc1TotalSupply } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1TotalSupply(queryParams);

			expect(res).toEqual(expectedSupply);
			expect(service.icrc1_total_supply).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_total_supply throws', async () => {
			service.icrc1_total_supply.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1TotalSupply } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1TotalSupply(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1SupportedStandards', () => {
		it('returns correct supported standards', async () => {
			const expectedStandards: Array<SupportedStandard> = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' }
			];
			service.icrc1_supported_standards.mockResolvedValue(expectedStandards);

			const { icrc1SupportedStandards } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1SupportedStandards(queryParams);

			expect(res).toEqual(expectedStandards);
			expect(service.icrc1_supported_standards).toHaveBeenCalled();
		});

		it('should throw an error if icrc1_supported_standards throws', async () => {
			service.icrc1_supported_standards.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1SupportedStandards } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1SupportedStandards(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc1Transfer', () => {
		it('returns successful transfer result', async () => {
			const expectedResult = { Ok: BigInt(1) };
			service.icrc1_transfer.mockResolvedValue(expectedResult);

			const { icrc1Transfer } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc1Transfer(transferArgs);

			expect(res).toEqual(BigInt(1));
			expect(service.icrc1_transfer).toHaveBeenCalledWith(transferArgs);
		});

		it('should throw an error if transfer fails', async () => {
			service.icrc1_transfer.mockResolvedValue(errorResponse);

			const { icrc1Transfer } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			await expect(icrc1Transfer(transferArgs)).rejects.toThrow();
		});

		it('should throw an error if icrc1_transfer throws', async () => {
			service.icrc1_transfer.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc1Transfer } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc1Transfer(transferArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc2Allowance', () => {
		it('returns correct allowance', async () => {
			const expectedAllowance: Allowance = {
				allowance: BigInt(1000),
				expires_at: []
			};
			service.icrc2_allowance.mockResolvedValue(expectedAllowance);

			const { icrc2Allowance } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc2Allowance({ args: allowanceArgs, certified: false });

			expect(res).toEqual(expectedAllowance);
			expect(service.icrc2_allowance).toHaveBeenCalledWith(allowanceArgs);
		});

		it('should throw an error if icrc2_allowance throws', async () => {
			service.icrc2_allowance.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc2Allowance } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc2Allowance({ args: allowanceArgs, certified: false });

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc2Approve', () => {
		it('returns successful approve result', async () => {
			const expectedResult = { Ok: BigInt(1) };
			service.icrc2_approve.mockResolvedValue(expectedResult);

			const { icrc2Approve } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc2Approve(approveArgs);

			expect(res).toEqual(BigInt(1));
			expect(service.icrc2_approve).toHaveBeenCalledWith(approveArgs);
		});

		it('should throw an error if approve fails', async () => {
			service.icrc2_approve.mockResolvedValue(errorResponse);

			const { icrc2Approve } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			await expect(icrc2Approve(approveArgs)).rejects.toThrow();
		});

		it('should throw an error if icrc2_approve throws', async () => {
			service.icrc2_approve.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc2Approve } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc2Approve(approveArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc2TransferFrom', () => {
		it('returns successful transfer from result', async () => {
			const expectedResult = { Ok: BigInt(1) };
			service.icrc2_transfer_from.mockResolvedValue(expectedResult);

			const { icrc2TransferFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _transferFromArgs: TransferFromArgs = {
				from: testAccount,
				to: testSpender,
				amount: BigInt(1000),
				fee: [],
				memo: [],
				created_at_time: [],
				spender_subaccount: []
			};

			const res = await icrc2TransferFrom(_transferFromArgs);

			expect(res).toEqual(BigInt(1));
			expect(service.icrc2_transfer_from).toHaveBeenCalledWith(_transferFromArgs);
		});

		it('should throw an error if transfer from fails', async () => {
			service.icrc2_transfer_from.mockResolvedValue(errorResponse);

			const { icrc2TransferFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _transferFromArgs: TransferFromArgs = {
				from: testAccount,
				to: testSpender,
				amount: BigInt(1000),
				fee: [],
				memo: [],
				created_at_time: [],
				spender_subaccount: []
			};

			await expect(icrc2TransferFrom(_transferFromArgs)).rejects.toThrow();
		});

		it('should throw an error if icrc2_transfer_from throws', async () => {
			service.icrc2_transfer_from.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc2TransferFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _transferFromArgs: TransferFromArgs = {
				from: testAccount,
				to: testSpender,
				amount: BigInt(1000),
				fee: [],
				memo: [],
				created_at_time: [],
				spender_subaccount: []
			};

			const res = icrc2TransferFrom(_transferFromArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('createCanister', () => {
		it('returns successful create canister result', async () => {
			const expectedCanisterId = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const expectedResult = {
				Ok: {
					block_id: BigInt(1),
					canister_id: expectedCanisterId
				}
			};
			service.create_canister.mockResolvedValue(expectedResult);

			const { createCanister } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _createCanisterArgs: CreateCanisterArgs = {
				amount: BigInt(100000000),
				from_subaccount: [],
				created_at_time: [],
				creation_args: []
			};

			const res = await createCanister(_createCanisterArgs);

			expect(res).toEqual({
				block_id: BigInt(1),
				canister_id: expectedCanisterId
			});
			expect(service.create_canister).toHaveBeenCalledWith(_createCanisterArgs);
		});

		it('should throw an error if create canister fails', async () => {
			service.create_canister.mockResolvedValue(errorResponse);

			const { createCanister } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _createCanisterArgs: CreateCanisterArgs = {
				amount: BigInt(100000000),
				from_subaccount: [],
				created_at_time: [],
				creation_args: []
			};

			await expect(createCanister(_createCanisterArgs)).rejects.toThrow();
		});

		it('should throw an error if create_canister throws', async () => {
			service.create_canister.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { createCanister } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _createCanisterArgs: CreateCanisterArgs = {
				amount: BigInt(100000000),
				from_subaccount: [],
				created_at_time: [],
				creation_args: []
			};

			const res = createCanister(_createCanisterArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('deposit', () => {
		it('returns successful deposit result', async () => {
			const expectedResult: DepositResult = {
				balance: BigInt(2000),
				block_index: BigInt(1)
			};
			service.deposit.mockResolvedValue(expectedResult);

			const { deposit } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const depositArgs: DepositArgs = {
				to: testAccount,
				memo: []
			};

			const res = await deposit(depositArgs);

			expect(res).toEqual(expectedResult);
			expect(service.deposit).toHaveBeenCalledWith(depositArgs);
		});

		it('should throw an error if deposit throws', async () => {
			service.deposit.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { deposit } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const depositArgs: DepositArgs = {
				to: testAccount,
				memo: []
			};

			const res = deposit(depositArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('withdraw', () => {
		it('returns successful withdraw result', async () => {
			const expectedResult = { Ok: BigInt(1) };
			service.withdraw.mockResolvedValue(expectedResult);

			const { withdraw } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const withdrawArgs: WithdrawArgs = {
				to: mockPrincipal,
				amount: BigInt(1000000),
				from_subaccount: [],
				created_at_time: []
			};

			const res = await withdraw(withdrawArgs);

			expect(res).toEqual(BigInt(1));
			expect(service.withdraw).toHaveBeenCalledWith(withdrawArgs);
		});

		it('should throw an error if withdraw fails', async () => {
			service.withdraw.mockResolvedValue(errorResponse);

			const { withdraw } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const withdrawArgs: WithdrawArgs = {
				to: mockPrincipal,
				amount: BigInt(1000000),
				from_subaccount: [],
				created_at_time: []
			};

			await expect(withdraw(withdrawArgs)).rejects.toThrow();
		});

		it('should throw an error if withdraw throws', async () => {
			service.withdraw.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { withdraw } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const withdrawArgs: WithdrawArgs = {
				to: mockPrincipal,
				amount: BigInt(1000000),
				from_subaccount: [],
				created_at_time: []
			};

			const res = withdraw(withdrawArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('withdrawFrom', () => {
		it('returns successful withdraw from result', async () => {
			const expectedResult = { Ok: BigInt(1) };
			service.withdraw_from.mockResolvedValue(expectedResult);

			const { withdrawFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _withdrawFromArgs: WithdrawFromArgs = {
				from: testAccount,
				to: mockPrincipal,
				amount: BigInt(1000000),
				created_at_time: [],
				spender_subaccount: []
			};

			const res = await withdrawFrom(_withdrawFromArgs);

			expect(res).toEqual(BigInt(1));
			expect(service.withdraw_from).toHaveBeenCalledWith(_withdrawFromArgs);
		});

		it('should throw an error if withdraw from fails', async () => {
			service.withdraw_from.mockResolvedValue(errorResponse);

			const { withdrawFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _withdrawFromArgs: WithdrawFromArgs = {
				from: testAccount,
				to: mockPrincipal,
				amount: BigInt(1000000),
				created_at_time: [],
				spender_subaccount: []
			};

			await expect(withdrawFrom(_withdrawFromArgs)).rejects.toThrow();
		});

		it('should throw an error if withdraw_from throws', async () => {
			service.withdraw_from.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { withdrawFrom } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const _withdrawFromArgs: WithdrawFromArgs = {
				from: testAccount,
				to: mockPrincipal,
				amount: BigInt(1000000),
				created_at_time: [],
				spender_subaccount: []
			};

			const res = withdrawFrom(_withdrawFromArgs);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc3GetArchives', () => {
		it('returns archives', async () => {
			const expectedArchives: GetArchivesResult = [
				{
					start: BigInt(0),
					end: BigInt(100),
					canister_id: Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai')
				}
			];
			service.icrc3_get_archives.mockResolvedValue(expectedArchives);

			const { icrc3GetArchives } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const getArchivesArgs: GetArchivesArgs = { from: [] };
			const res = await icrc3GetArchives({ args: getArchivesArgs, certified: false });

			expect(res).toEqual(expectedArchives);
			expect(service.icrc3_get_archives).toHaveBeenCalledWith(getArchivesArgs);
		});

		it('should throw an error if icrc3_get_archives throws', async () => {
			service.icrc3_get_archives.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc3GetArchives } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const getArchivesArgs: GetArchivesArgs = { from: [] };
			const res = icrc3GetArchives({ args: getArchivesArgs, certified: false });

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc3GetBlocks', () => {
		it('returns blocks', async () => {
			const value: Value = { Nat: BigInt(1000) };
			const expectedBlocks: GetBlocksResult = {
				log_length: BigInt(10),
				blocks: [{ id: BigInt(1), block: value }],
				archived_blocks: []
			};
			service.icrc3_get_blocks.mockResolvedValue(expectedBlocks);

			const { icrc3GetBlocks } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const getBlocksArgs: GetBlocksArgs = [{ start: BigInt(0), length: BigInt(10) }];
			const res = await icrc3GetBlocks({ args: getBlocksArgs, certified: false });

			expect(res).toEqual(expectedBlocks);
			expect(service.icrc3_get_blocks).toHaveBeenCalledWith(getBlocksArgs);
		});

		it('should throw an error if icrc3_get_blocks throws', async () => {
			service.icrc3_get_blocks.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc3GetBlocks } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const getBlocksArgs: GetBlocksArgs = [{ start: BigInt(0), length: BigInt(10) }];
			const res = icrc3GetBlocks({ args: getBlocksArgs, certified: false });

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc3GetTipCertificate', () => {
		it('returns tip certificate', async () => {
			const certificate: DataCertificate = {
				certificate: new Uint8Array([1, 2, 3]),
				hash_tree: new Uint8Array([4, 5, 6])
			};
			const expectedCertificate: [DataCertificate] = [certificate];
			service.icrc3_get_tip_certificate.mockResolvedValue(expectedCertificate);

			const { icrc3GetTipCertificate } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc3GetTipCertificate(queryParams);

			expect(res).toEqual(expectedCertificate);
			expect(service.icrc3_get_tip_certificate).toHaveBeenCalled();
		});

		it('should throw an error if icrc3_get_tip_certificate throws', async () => {
			service.icrc3_get_tip_certificate.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc3GetTipCertificate } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc3GetTipCertificate(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});

	describe('icrc3SupportedBlockTypes', () => {
		it('returns supported block types', async () => {
			const expectedBlockTypes: Array<SupportedBlockType> = [
				{
					block_type: 'transaction',
					url: 'https://github.com/dfinity/ICRC-3/tree/main/extensions/transaction'
				}
			];
			service.icrc3_supported_block_types.mockResolvedValue(expectedBlockTypes);

			const { icrc3SupportedBlockTypes } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = await icrc3SupportedBlockTypes(queryParams);

			expect(res).toEqual(expectedBlockTypes);
			expect(service.icrc3_supported_block_types).toHaveBeenCalled();
		});

		it('should throw an error if icrc3_supported_block_types throws', async () => {
			service.icrc3_supported_block_types.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { icrc3SupportedBlockTypes } = await createCyclesLedgerCanister({
				serviceOverride: service
			});

			const res = icrc3SupportedBlockTypes(queryParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
