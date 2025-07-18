// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const TxError = IDL.Variant({
		NotifyDfxFailed: IDL.Null,
		InsufficientAllowance: IDL.Null,
		UnexpectedCyclesResponse: IDL.Null,
		InsufficientBalance: IDL.Null,
		InsufficientXTCFee: IDL.Null,
		ErrorOperationStyle: IDL.Null,
		Unauthorized: IDL.Null,
		LedgerTrap: IDL.Null,
		ErrorTo: IDL.Null,
		Other: IDL.Null,
		FetchRateFailed: IDL.Null,
		BlockUsed: IDL.Null,
		AmountTooSmall: IDL.Null
	});
	const TxReceipt = IDL.Variant({ Ok: IDL.Nat, Err: TxError });
	const TransactionId = IDL.Nat64;
	const BurnError = IDL.Variant({
		InsufficientBalance: IDL.Null,
		InvalidTokenContract: IDL.Null,
		NotSufficientLiquidity: IDL.Null
	});
	const BurnResult = IDL.Variant({ Ok: TransactionId, Err: BurnError });
	const TransactionStatus = IDL.Variant({
		FAILED: IDL.Null,
		SUCCEEDED: IDL.Null
	});
	const EventDetail = IDL.Variant({
		Approve: IDL.Record({ to: IDL.Principal, from: IDL.Principal }),
		Burn: IDL.Record({ to: IDL.Principal, from: IDL.Principal }),
		Mint: IDL.Record({ to: IDL.Principal }),
		CanisterCreated: IDL.Record({
			from: IDL.Principal,
			canister: IDL.Principal
		}),
		CanisterCalled: IDL.Record({
			from: IDL.Principal,
			method_name: IDL.Text,
			canister: IDL.Principal
		}),
		Transfer: IDL.Record({ to: IDL.Principal, from: IDL.Principal }),
		TransferFrom: IDL.Record({
			to: IDL.Principal,
			from: IDL.Principal,
			caller: IDL.Principal
		})
	});
	const Event = IDL.Record({
		fee: IDL.Nat64,
		status: TransactionStatus,
		kind: EventDetail,
		cycles: IDL.Nat64,
		timestamp: IDL.Nat64
	});
	const EventsConnection = IDL.Record({
		data: IDL.Vec(Event),
		next_offset: TransactionId,
		next_canister_id: IDL.Opt(IDL.Principal)
	});
	const Metadata = IDL.Record({
		fee: IDL.Nat,
		decimals: IDL.Nat8,
		owner: IDL.Principal,
		logo: IDL.Text,
		name: IDL.Text,
		totalSupply: IDL.Nat,
		symbol: IDL.Text
	});
	const Operation = IDL.Variant({
		transferFrom: IDL.Null,
		burn: IDL.Null,
		mint: IDL.Null,
		approve: IDL.Null,
		canisterCalled: IDL.Null,
		transfer: IDL.Null,
		canisterCreated: IDL.Null
	});
	const Time = IDL.Int;
	const TxRecord = IDL.Record({
		op: Operation,
		to: IDL.Principal,
		fee: IDL.Nat,
		status: TransactionStatus,
		from: IDL.Principal,
		timestamp: Time,
		caller: IDL.Opt(IDL.Principal),
		index: IDL.Nat,
		amount: IDL.Nat
	});
	const MintError = IDL.Variant({ NotSufficientLiquidity: IDL.Null });
	const MintResult = IDL.Variant({ Ok: TransactionId, Err: MintError });
	const Stats = IDL.Record({
		fee: IDL.Nat,
		transfers_count: IDL.Nat64,
		balance: IDL.Nat64,
		mints_count: IDL.Nat64,
		transfers_from_count: IDL.Nat64,
		canisters_created_count: IDL.Nat64,
		supply: IDL.Nat,
		burns_count: IDL.Nat64,
		approvals_count: IDL.Nat64,
		proxy_calls_count: IDL.Nat64,
		history_events: IDL.Nat64
	});
	const TxReceiptLegacy = IDL.Variant({
		Ok: IDL.Nat,
		Err: IDL.Variant({
			InsufficientAllowance: IDL.Null,
			InsufficientBalance: IDL.Null
		})
	});
	const ResultCall = IDL.Variant({
		Ok: IDL.Record({ return: IDL.Vec(IDL.Nat8) }),
		Err: IDL.Text
	});
	const CreateResult = IDL.Variant({
		Ok: IDL.Record({ canister_id: IDL.Principal }),
		Err: IDL.Text
	});
	const ResultSend = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
	return IDL.Service({
		allowance: IDL.Func([IDL.Principal, IDL.Principal], [IDL.Nat]),
		approve: IDL.Func([IDL.Principal, IDL.Nat], [TxReceipt], []),
		balance: IDL.Func([IDL.Opt(IDL.Principal)], [IDL.Nat64], []),
		balanceOf: IDL.Func([IDL.Principal], [IDL.Nat]),
		burn: IDL.Func(
			[IDL.Record({ canister_id: IDL.Principal, amount: IDL.Nat64 })],
			[BurnResult],
			[]
		),
		decimals: IDL.Func([], [IDL.Nat8]),
		events: IDL.Func(
			[IDL.Record({ offset: IDL.Opt(IDL.Nat64), limit: IDL.Nat16 })],
			[EventsConnection]
		),
		getBlockUsed: IDL.Func([], [IDL.Vec(IDL.Nat64)]),
		getMetadata: IDL.Func([], [Metadata]),
		getTransaction: IDL.Func([IDL.Nat], [TxRecord], []),
		getTransactions: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(TxRecord)], []),
		get_map_block_used: IDL.Func([IDL.Nat64], [IDL.Opt(IDL.Nat64)]),
		get_transaction: IDL.Func([TransactionId], [IDL.Opt(Event)], []),
		halt: IDL.Func([], [], []),
		historySize: IDL.Func([], [IDL.Nat]),
		isBlockUsed: IDL.Func([IDL.Nat64], [IDL.Bool]),
		logo: IDL.Func([], [IDL.Text]),
		mint: IDL.Func([IDL.Principal, IDL.Nat], [MintResult], []),
		mint_by_icp: IDL.Func([IDL.Opt(IDL.Vec(IDL.Nat8)), IDL.Nat64], [TxReceipt], []),
		mint_by_icp_recover: IDL.Func(
			[IDL.Opt(IDL.Vec(IDL.Nat8)), IDL.Nat64, IDL.Principal],
			[TxReceipt],
			[]
		),
		name: IDL.Func([], [IDL.Text]),
		nameErc20: IDL.Func([], [IDL.Text]),
		stats: IDL.Func([], [Stats]),
		symbol: IDL.Func([], [IDL.Text]),
		totalSupply: IDL.Func([], [IDL.Nat]),
		transfer: IDL.Func([IDL.Principal, IDL.Nat], [TxReceipt], []),
		transferErc20: IDL.Func([IDL.Principal, IDL.Nat], [TxReceiptLegacy], []),
		transferFrom: IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [TxReceipt], []),
		wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })]),
		wallet_call: IDL.Func(
			[
				IDL.Record({
					args: IDL.Vec(IDL.Nat8),
					cycles: IDL.Nat64,
					method_name: IDL.Text,
					canister: IDL.Principal
				})
			],
			[ResultCall],
			[]
		),
		wallet_create_canister: IDL.Func(
			[
				IDL.Record({
					controller: IDL.Opt(IDL.Principal),
					cycles: IDL.Nat64
				})
			],
			[CreateResult],
			[]
		),
		wallet_create_wallet: IDL.Func(
			[
				IDL.Record({
					controller: IDL.Opt(IDL.Principal),
					cycles: IDL.Nat64
				})
			],
			[CreateResult],
			[]
		),
		wallet_send: IDL.Func(
			[IDL.Record({ canister: IDL.Principal, amount: IDL.Nat64 })],
			[ResultSend],
			[]
		)
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	return [];
};
