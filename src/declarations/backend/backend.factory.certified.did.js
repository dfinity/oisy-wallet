// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		allowed_callers: IDL.Vec(IDL.Principal)
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	const CanisterStatusType = IDL.Variant({
		stopped: IDL.Null,
		stopping: IDL.Null,
		running: IDL.Null
	});
	const DefiniteCanisterSettingsArgs = IDL.Record({
		controller: IDL.Principal,
		freezing_threshold: IDL.Nat,
		controllers: IDL.Vec(IDL.Principal),
		memory_allocation: IDL.Nat,
		compute_allocation: IDL.Nat
	});
	const CanisterStatusResultV2 = IDL.Record({
		controller: IDL.Principal,
		status: CanisterStatusType,
		freezing_threshold: IDL.Nat,
		balance: IDL.Vec(IDL.Tuple(IDL.Vec(IDL.Nat8), IDL.Nat)),
		memory_size: IDL.Nat,
		cycles: IDL.Nat,
		settings: DefiniteCanisterSettingsArgs,
		idle_cycles_burned_per_day: IDL.Nat,
		module_hash: IDL.Opt(IDL.Vec(IDL.Nat8))
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
	const IcrcToken = IDL.Record({
		ledger_id: IDL.Principal,
		index_id: IDL.Opt(IDL.Principal)
	});
	const Token = IDL.Variant({ Icrc: IcrcToken });
	const CustomToken = IDL.Record({
		token: Token,
		version: IDL.Opt(IDL.Nat64),
		enabled: IDL.Bool
	});
	const UserToken = IDL.Record({
		decimals: IDL.Opt(IDL.Nat8),
		version: IDL.Opt(IDL.Nat64),
		enabled: IDL.Opt(IDL.Bool),
		chain_id: IDL.Nat64,
		contract_address: IDL.Text,
		symbol: IDL.Opt(IDL.Text)
	});
	const UserTokenId = IDL.Record({
		chain_id: IDL.Nat64,
		contract_address: IDL.Text
	});
	const SignRequest = IDL.Record({
		to: IDL.Text,
		gas: IDL.Nat,
		value: IDL.Nat,
		max_priority_fee_per_gas: IDL.Nat,
		data: IDL.Opt(IDL.Text),
		max_fee_per_gas: IDL.Nat,
		chain_id: IDL.Nat,
		nonce: IDL.Nat
	});
	return IDL.Service({
		caller_eth_address: IDL.Func([], [IDL.Text], []),
		eth_address_of: IDL.Func([IDL.Principal], [IDL.Text], []),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		http_request: IDL.Func([HttpRequest], [HttpResponse]),
		list_custom_tokens: IDL.Func([], [IDL.Vec(CustomToken)]),
		list_user_tokens: IDL.Func([], [IDL.Vec(UserToken)]),
		personal_sign: IDL.Func([IDL.Text], [IDL.Text], []),
		remove_user_token: IDL.Func([UserTokenId], [], []),
		set_custom_token: IDL.Func([CustomToken], [], []),
		set_many_custom_tokens: IDL.Func([IDL.Vec(CustomToken)], [], []),
		set_many_user_tokens: IDL.Func([IDL.Vec(UserToken)], [], []),
		set_user_token: IDL.Func([UserToken], [], []),
		sign_prehash: IDL.Func([IDL.Text], [IDL.Text], []),
		sign_transaction: IDL.Func([SignRequest], [IDL.Text], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		allowed_callers: IDL.Vec(IDL.Principal)
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
