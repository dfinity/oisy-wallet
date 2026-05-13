/* eslint-disable */

// @ts-nocheck

// ICRC-7 Non-Fungible Token Standard IDL factory (certified queries).
// Hand-authored to match src/declarations/icrc7/icrc7.did until icrc7 is wired into
// scripts/generate.sh; re-running `npm run generate` will overwrite this file.

export const idlFactory = ({ IDL }) => {
	const Subaccount = IDL.Vec(IDL.Nat8);
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(Subaccount)
	});
	const Value = IDL.Rec();
	Value.fill(
		IDL.Variant({
			Blob: IDL.Vec(IDL.Nat8),
			Text: IDL.Text,
			Nat: IDL.Nat,
			Int: IDL.Int,
			Array: IDL.Vec(Value),
			Map: IDL.Vec(IDL.Tuple(IDL.Text, Value))
		})
	);
	const TransferArg = IDL.Record({
		from_subaccount: IDL.Opt(Subaccount),
		to: Account,
		token_id: IDL.Nat,
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64)
	});
	const TransferError = IDL.Variant({
		NonExistingTokenId: IDL.Null,
		InvalidRecipient: IDL.Null,
		Unauthorized: IDL.Null,
		TooOld: IDL.Null,
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
		GenericBatchError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text })
	});
	const TransferResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferError });
	const StandardRecord = IDL.Record({ name: IDL.Text, url: IDL.Text });

	return IDL.Service({
		icrc7_collection_metadata: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, Value))], []),
		icrc7_symbol: IDL.Func([], [IDL.Text], []),
		icrc7_name: IDL.Func([], [IDL.Text], []),
		icrc7_description: IDL.Func([], [IDL.Opt(IDL.Text)], []),
		icrc7_logo: IDL.Func([], [IDL.Opt(IDL.Text)], []),
		icrc7_total_supply: IDL.Func([], [IDL.Nat], []),
		icrc7_supply_cap: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_max_query_batch_size: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_max_update_batch_size: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_default_take_value: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_max_take_value: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_max_memo_size: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_atomic_batch_transfers: IDL.Func([], [IDL.Opt(IDL.Bool)], []),
		icrc7_tx_window: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_permitted_drift: IDL.Func([], [IDL.Opt(IDL.Nat)], []),
		icrc7_token_metadata: IDL.Func(
			[IDL.Vec(IDL.Nat)],
			[IDL.Vec(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value))))],
			[]
		),
		icrc7_owner_of: IDL.Func([IDL.Vec(IDL.Nat)], [IDL.Vec(IDL.Opt(Account))], []),
		icrc7_balance_of: IDL.Func([IDL.Vec(Account)], [IDL.Vec(IDL.Nat)], []),
		icrc7_tokens: IDL.Func([IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)], [IDL.Vec(IDL.Nat)], []),
		icrc7_tokens_of: IDL.Func(
			[Account, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
			[IDL.Vec(IDL.Nat)],
			[]
		),
		icrc7_transfer: IDL.Func([IDL.Vec(TransferArg)], [IDL.Vec(IDL.Opt(TransferResult))], []),
		icrc10_supported_standards: IDL.Func([], [IDL.Vec(StandardRecord)], [])
	});
};

export const init = ({ IDL }) => {
	return [];
};
