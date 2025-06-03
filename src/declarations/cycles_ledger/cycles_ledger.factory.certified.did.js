// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const GetBlocksResult = IDL.Rec();
	const Value = IDL.Rec();
	const ChangeIndexId = IDL.Variant({
		SetTo: IDL.Principal,
		Unset: IDL.Null
	});
	const UpgradeArgs = IDL.Record({
		change_index_id: IDL.Opt(ChangeIndexId),
		max_blocks_per_request: IDL.Opt(IDL.Nat64)
	});
	const InitArgs = IDL.Record({
		index_id: IDL.Opt(IDL.Principal),
		max_blocks_per_request: IDL.Nat64
	});
	const LedgerArgs = IDL.Variant({
		Upgrade: IDL.Opt(UpgradeArgs),
		Init: InitArgs
	});
	const SubnetFilter = IDL.Record({ subnet_type: IDL.Opt(IDL.Text) });
	const SubnetSelection = IDL.Variant({
		Filter: SubnetFilter,
		Subnet: IDL.Record({ subnet: IDL.Principal })
	});
	const CanisterSettings = IDL.Record({
		freezing_threshold: IDL.Opt(IDL.Nat),
		controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
		reserved_cycles_limit: IDL.Opt(IDL.Nat),
		memory_allocation: IDL.Opt(IDL.Nat),
		compute_allocation: IDL.Opt(IDL.Nat)
	});
	const CmcCreateCanisterArgs = IDL.Record({
		subnet_selection: IDL.Opt(SubnetSelection),
		settings: IDL.Opt(CanisterSettings)
	});
	const CreateCanisterArgs = IDL.Record({
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat,
		creation_args: IDL.Opt(CmcCreateCanisterArgs)
	});
	const BlockIndex = IDL.Nat;
	const CreateCanisterSuccess = IDL.Record({
		block_id: BlockIndex,
		canister_id: IDL.Principal
	});
	const CreateCanisterError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		Duplicate: IDL.Record({
			duplicate_of: IDL.Nat,
			canister_id: IDL.Opt(IDL.Principal)
		}),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		FailedToCreate: IDL.Record({
			error: IDL.Text,
			refund_block: IDL.Opt(BlockIndex),
			fee_block: IDL.Opt(BlockIndex)
		}),
		TooOld: IDL.Null,
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const CreateCanisterFromArgs = IDL.Record({
		spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		from: Account,
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat,
		creation_args: IDL.Opt(CmcCreateCanisterArgs)
	});
	const RejectionCode = IDL.Variant({
		NoError: IDL.Null,
		CanisterError: IDL.Null,
		SysTransient: IDL.Null,
		DestinationInvalid: IDL.Null,
		Unknown: IDL.Null,
		SysFatal: IDL.Null,
		CanisterReject: IDL.Null
	});
	const CreateCanisterFromError = IDL.Variant({
		FailedToCreateFrom: IDL.Record({
			create_from_block: IDL.Opt(BlockIndex),
			rejection_code: RejectionCode,
			refund_block: IDL.Opt(BlockIndex),
			approval_refund_block: IDL.Opt(BlockIndex),
			rejection_reason: IDL.Text
		}),
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
		Duplicate: IDL.Record({
			duplicate_of: IDL.Nat,
			canister_id: IDL.Opt(IDL.Principal)
		}),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const DepositArgs = IDL.Record({
		to: Account,
		memo: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const DepositResult = IDL.Record({
		balance: IDL.Nat,
		block_index: BlockIndex
	});
	const HttpRequest = IDL.Record({
		url: IDL.Text,
		method: IDL.Text,
		body: IDL.Vec(IDL.Nat8),
		headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))
	});
	const HttpResponse = IDL.Record({
		body: IDL.Vec(IDL.Nat8),
		headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
		status_code: IDL.Nat16
	});
	const MetadataValue = IDL.Variant({
		Int: IDL.Int,
		Nat: IDL.Nat,
		Blob: IDL.Vec(IDL.Nat8),
		Text: IDL.Text
	});
	const SupportedStandard = IDL.Record({ url: IDL.Text, name: IDL.Text });
	const TransferArgs = IDL.Record({
		to: Account,
		fee: IDL.Opt(IDL.Nat),
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat
	});
	const TransferError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		BadFee: IDL.Record({ expected_fee: IDL.Nat }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const AllowanceArgs = IDL.Record({
		account: Account,
		spender: Account
	});
	const Allowance = IDL.Record({
		allowance: IDL.Nat,
		expires_at: IDL.Opt(IDL.Nat64)
	});
	const ApproveArgs = IDL.Record({
		fee: IDL.Opt(IDL.Nat),
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat,
		expected_allowance: IDL.Opt(IDL.Nat),
		expires_at: IDL.Opt(IDL.Nat64),
		spender: Account
	});
	const ApproveError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		BadFee: IDL.Record({ expected_fee: IDL.Nat }),
		AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const TransferFromArgs = IDL.Record({
		to: Account,
		fee: IDL.Opt(IDL.Nat),
		spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		from: Account,
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat
	});
	const TransferFromError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
		BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		BadFee: IDL.Record({ expected_fee: IDL.Nat }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const GetArchivesArgs = IDL.Record({ from: IDL.Opt(IDL.Principal) });
	const GetArchivesResult = IDL.Vec(
		IDL.Record({
			end: IDL.Nat,
			canister_id: IDL.Principal,
			start: IDL.Nat
		})
	);
	const GetBlocksArgs = IDL.Vec(IDL.Record({ start: IDL.Nat, length: IDL.Nat }));
	Value.fill(
		IDL.Variant({
			Int: IDL.Int,
			Map: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
			Nat: IDL.Nat,
			Nat64: IDL.Nat64,
			Blob: IDL.Vec(IDL.Nat8),
			Text: IDL.Text,
			Array: IDL.Vec(Value)
		})
	);
	GetBlocksResult.fill(
		IDL.Record({
			log_length: IDL.Nat,
			blocks: IDL.Vec(IDL.Record({ id: IDL.Nat, block: Value })),
			archived_blocks: IDL.Vec(
				IDL.Record({
					args: GetBlocksArgs,
					callback: IDL.Func([GetBlocksArgs], [GetBlocksResult])
				})
			)
		})
	);
	const DataCertificate = IDL.Record({
		certificate: IDL.Vec(IDL.Nat8),
		hash_tree: IDL.Vec(IDL.Nat8)
	});
	const SupportedBlockType = IDL.Record({
		url: IDL.Text,
		block_type: IDL.Text
	});
	const WithdrawArgs = IDL.Record({
		to: IDL.Principal,
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat
	});
	const WithdrawError = IDL.Variant({
		FailedToWithdraw: IDL.Record({
			rejection_code: RejectionCode,
			fee_block: IDL.Opt(IDL.Nat),
			rejection_reason: IDL.Text
		}),
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		BadFee: IDL.Record({ expected_fee: IDL.Nat }),
		InvalidReceiver: IDL.Record({ receiver: IDL.Principal }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	const WithdrawFromArgs = IDL.Record({
		to: IDL.Principal,
		spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		from: Account,
		created_at_time: IDL.Opt(IDL.Nat64),
		amount: IDL.Nat
	});
	const WithdrawFromError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
		Duplicate: IDL.Record({ duplicate_of: BlockIndex }),
		InvalidReceiver: IDL.Record({ receiver: IDL.Principal }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		FailedToWithdrawFrom: IDL.Record({
			withdraw_from_block: IDL.Opt(IDL.Nat),
			rejection_code: RejectionCode,
			refund_block: IDL.Opt(IDL.Nat),
			approval_refund_block: IDL.Opt(IDL.Nat),
			rejection_reason: IDL.Text
		}),
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
	});
	return IDL.Service({
		create_canister: IDL.Func(
			[CreateCanisterArgs],
			[
				IDL.Variant({
					Ok: CreateCanisterSuccess,
					Err: CreateCanisterError
				})
			],
			[]
		),
		create_canister_from: IDL.Func(
			[CreateCanisterFromArgs],
			[
				IDL.Variant({
					Ok: CreateCanisterSuccess,
					Err: CreateCanisterFromError
				})
			],
			[]
		),
		deposit: IDL.Func([DepositArgs], [DepositResult], []),
		http_request: IDL.Func([HttpRequest], [HttpResponse]),
		icrc1_balance_of: IDL.Func([Account], [IDL.Nat]),
		icrc1_decimals: IDL.Func([], [IDL.Nat8]),
		icrc1_fee: IDL.Func([], [IDL.Nat]),
		icrc1_metadata: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue))]),
		icrc1_minting_account: IDL.Func([], [IDL.Opt(Account)]),
		icrc1_name: IDL.Func([], [IDL.Text]),
		icrc1_supported_standards: IDL.Func([], [IDL.Vec(SupportedStandard)]),
		icrc1_symbol: IDL.Func([], [IDL.Text]),
		icrc1_total_supply: IDL.Func([], [IDL.Nat]),
		icrc1_transfer: IDL.Func(
			[TransferArgs],
			[IDL.Variant({ Ok: BlockIndex, Err: TransferError })],
			[]
		),
		icrc2_allowance: IDL.Func([AllowanceArgs], [Allowance]),
		icrc2_approve: IDL.Func([ApproveArgs], [IDL.Variant({ Ok: IDL.Nat, Err: ApproveError })], []),
		icrc2_transfer_from: IDL.Func(
			[TransferFromArgs],
			[IDL.Variant({ Ok: IDL.Nat, Err: TransferFromError })],
			[]
		),
		icrc3_get_archives: IDL.Func([GetArchivesArgs], [GetArchivesResult]),
		icrc3_get_blocks: IDL.Func([GetBlocksArgs], [GetBlocksResult]),
		icrc3_get_tip_certificate: IDL.Func([], [IDL.Opt(DataCertificate)]),
		icrc3_supported_block_types: IDL.Func([], [IDL.Vec(SupportedBlockType)]),
		withdraw: IDL.Func([WithdrawArgs], [IDL.Variant({ Ok: BlockIndex, Err: WithdrawError })], []),
		withdraw_from: IDL.Func(
			[WithdrawFromArgs],
			[IDL.Variant({ Ok: BlockIndex, Err: WithdrawFromError })],
			[]
		)
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const ChangeIndexId = IDL.Variant({
		SetTo: IDL.Principal,
		Unset: IDL.Null
	});
	const UpgradeArgs = IDL.Record({
		change_index_id: IDL.Opt(ChangeIndexId),
		max_blocks_per_request: IDL.Opt(IDL.Nat64)
	});
	const InitArgs = IDL.Record({
		index_id: IDL.Opt(IDL.Principal),
		max_blocks_per_request: IDL.Nat64
	});
	const LedgerArgs = IDL.Variant({
		Upgrade: IDL.Opt(UpgradeArgs),
		Init: InitArgs
	});
	return [LedgerArgs];
};
