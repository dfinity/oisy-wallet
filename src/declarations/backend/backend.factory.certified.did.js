// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const ApiEnabled = IDL.Variant({
		ReadOnly: IDL.Null,
		Enabled: IDL.Null,
		Disabled: IDL.Null
	});
	const Guards = IDL.Record({
		user_data: ApiEnabled,
		threshold_key: ApiEnabled
	});
	const CredentialType = IDL.Variant({ ProofOfUniqueness: IDL.Null });
	const SupportedCredential = IDL.Record({
		ii_canister_id: IDL.Principal,
		issuer_origin: IDL.Text,
		issuer_canister_id: IDL.Principal,
		ii_origin: IDL.Text,
		credential_type: CredentialType
	});
	const InitArg = IDL.Record({
		api: IDL.Opt(Guards),
		ecdsa_key_name: IDL.Text,
		allowed_callers: IDL.Vec(IDL.Principal),
		supported_credentials: IDL.Opt(IDL.Vec(SupportedCredential)),
		ic_root_key_der: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	const ArgumentValue = IDL.Variant({ Int: IDL.Int32, String: IDL.Text });
	const CredentialSpec = IDL.Record({
		arguments: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, ArgumentValue))),
		credential_type: IDL.Text
	});
	const AddUserCredentialRequest = IDL.Record({
		credential_jwt: IDL.Text,
		issuer_canister_id: IDL.Principal,
		current_user_version: IDL.Opt(IDL.Nat64),
		credential_spec: CredentialSpec
	});
	const AddUserCredentialError = IDL.Variant({
		InvalidCredential: IDL.Null,
		VersionMismatch: IDL.Null,
		ConfigurationError: IDL.Null,
		UserNotFound: IDL.Null
	});
	const Result = IDL.Variant({
		Ok: IDL.Null,
		Err: AddUserCredentialError
	});
	const Config = IDL.Record({
		api: IDL.Opt(Guards),
		ecdsa_key_name: IDL.Text,
		allowed_callers: IDL.Vec(IDL.Principal),
		supported_credentials: IDL.Opt(IDL.Vec(SupportedCredential)),
		ic_root_key_raw: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const UserCredential = IDL.Record({
		issuer: IDL.Text,
		verified_date_timestamp: IDL.Opt(IDL.Nat64),
		credential_type: CredentialType
	});
	const UserProfile = IDL.Record({
		credentials: IDL.Vec(UserCredential),
		version: IDL.Opt(IDL.Nat64),
		created_timestamp: IDL.Nat64,
		updated_timestamp: IDL.Nat64
	});
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
	const GetUserProfileError = IDL.Variant({ NotFound: IDL.Null });
	const Result_1 = IDL.Variant({
		Ok: UserProfile,
		Err: GetUserProfileError
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
	const ListUsersRequest = IDL.Record({
		updated_after_timestamp: IDL.Opt(IDL.Nat64),
		matches_max_length: IDL.Opt(IDL.Nat64)
	});
	const OisyUser = IDL.Record({
		principal: IDL.Principal,
		pouh_verified: IDL.Bool,
		updated_timestamp: IDL.Nat64
	});
	const ListUsersResponse = IDL.Record({
		users: IDL.Vec(OisyUser),
		matches_max_length: IDL.Nat64
	});
	const MigrationProgress = IDL.Variant({
		MigratedUserTokensUpTo: IDL.Principal,
		TargetPreCheckOk: IDL.Null,
		MigratedCustomTokensUpTo: IDL.Principal,
		Locked: IDL.Null,
		CheckingTargetCanister: IDL.Null,
		TargetLocked: IDL.Null,
		Completed: IDL.Null,
		Pending: IDL.Null
	});
	const MigrationReport = IDL.Record({
		to: IDL.Principal,
		progress: MigrationProgress
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
	const Stats = IDL.Record({
		user_profile_count: IDL.Nat64,
		custom_token_count: IDL.Nat64,
		user_token_count: IDL.Nat64
	});
	return IDL.Service({
		add_user_credential: IDL.Func([AddUserCredentialRequest], [Result], []),
		caller_eth_address: IDL.Func([], [IDL.Text], []),
		config: IDL.Func([], [Config]),
		create_user_profile: IDL.Func([], [UserProfile], []),
		eth_address_of: IDL.Func([IDL.Principal], [IDL.Text], []),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		get_user_profile: IDL.Func([], [Result_1]),
		http_request: IDL.Func([HttpRequest], [HttpResponse]),
		list_custom_tokens: IDL.Func([], [IDL.Vec(CustomToken)]),
		list_user_tokens: IDL.Func([], [IDL.Vec(UserToken)]),
		list_users: IDL.Func([ListUsersRequest], [ListUsersResponse]),
		migration: IDL.Func([], [IDL.Opt(MigrationReport)]),
		personal_sign: IDL.Func([IDL.Text], [IDL.Text], []),
		remove_user_token: IDL.Func([UserTokenId], [], []),
		set_custom_token: IDL.Func([CustomToken], [], []),
		set_guards: IDL.Func([Guards], [], []),
		set_many_custom_tokens: IDL.Func([IDL.Vec(CustomToken)], [], []),
		set_many_user_tokens: IDL.Func([IDL.Vec(UserToken)], [], []),
		set_user_token: IDL.Func([UserToken], [], []),
		sign_prehash: IDL.Func([IDL.Text], [IDL.Text], []),
		sign_transaction: IDL.Func([SignRequest], [IDL.Text], []),
		stats: IDL.Func([], [Stats])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const ApiEnabled = IDL.Variant({
		ReadOnly: IDL.Null,
		Enabled: IDL.Null,
		Disabled: IDL.Null
	});
	const Guards = IDL.Record({
		user_data: ApiEnabled,
		threshold_key: ApiEnabled
	});
	const CredentialType = IDL.Variant({ ProofOfUniqueness: IDL.Null });
	const SupportedCredential = IDL.Record({
		ii_canister_id: IDL.Principal,
		issuer_origin: IDL.Text,
		issuer_canister_id: IDL.Principal,
		ii_origin: IDL.Text,
		credential_type: CredentialType
	});
	const InitArg = IDL.Record({
		api: IDL.Opt(Guards),
		ecdsa_key_name: IDL.Text,
		allowed_callers: IDL.Vec(IDL.Principal),
		supported_credentials: IDL.Opt(IDL.Vec(SupportedCredential)),
		ic_root_key_der: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
