// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const CredentialType = IDL.Variant({ ProofOfUniqueness: IDL.Null });
	const SupportedCredential = IDL.Record({
		ii_canister_id: IDL.Principal,
		issuer_origin: IDL.Text,
		issuer_canister_id: IDL.Principal,
		ii_origin: IDL.Text,
		credential_type: CredentialType
	});
	const InitArg = IDL.Record({
		derivation_origin: IDL.Opt(IDL.Text),
		ecdsa_key_name: IDL.Text,
		cfs_canister_id: IDL.Opt(IDL.Principal),
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
	const AddUserCredentialResult = IDL.Variant({
		Ok: IDL.Null,
		Err: AddUserCredentialError
	});
	const AddHiddenDappIdRequest = IDL.Record({
		current_user_version: IDL.Opt(IDL.Nat64),
		dapp_id: IDL.Text
	});
	const AddDappSettingsError = IDL.Variant({
		MaxHiddenDappIds: IDL.Null,
		VersionMismatch: IDL.Null,
		DappIdTooLong: IDL.Null,
		UserNotFound: IDL.Null
	});
	const Result = IDL.Variant({ Ok: IDL.Null, Err: AddDappSettingsError });
	const AllowSigningRequest = IDL.Record({ nonce: IDL.Nat64 });
	const AllowSigningStatus = IDL.Variant({
		Skipped: IDL.Null,
		Failed: IDL.Null,
		Executed: IDL.Null
	});
	const ChallengeCompletion = IDL.Record({
		solved_duration_ms: IDL.Nat64,
		next_allowance_ms: IDL.Nat64,
		next_difficulty: IDL.Nat32,
		current_difficulty: IDL.Nat32
	});
	const AllowSigningResponse = IDL.Record({
		status: AllowSigningStatus,
		challenge_completion: IDL.Opt(ChallengeCompletion),
		allowed_cycles: IDL.Nat64
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
	const ChallengeCompletionError = IDL.Variant({
		InvalidNonce: IDL.Null,
		MissingChallenge: IDL.Null,
		ExpiredChallenge: IDL.Null,
		MissingUserProfile: IDL.Null,
		ChallengeAlreadySolved: IDL.Null
	});
	const AllowSigningError = IDL.Variant({
		ApproveError: ApproveError,
		PowChallenge: ChallengeCompletionError,
		Other: IDL.Text,
		FailedToContactCyclesLedger: IDL.Null
	});
	const Result_1 = IDL.Variant({
		Ok: AllowSigningResponse,
		Err: AllowSigningError
	});
	const BitcoinNetwork = IDL.Variant({
		mainnet: IDL.Null,
		regtest: IDL.Null,
		testnet: IDL.Null
	});
	const Outpoint = IDL.Record({
		txid: IDL.Vec(IDL.Nat8),
		vout: IDL.Nat32
	});
	const Utxo = IDL.Record({
		height: IDL.Nat32,
		value: IDL.Nat64,
		outpoint: Outpoint
	});
	const BtcAddPendingTransactionRequest = IDL.Record({
		txid: IDL.Vec(IDL.Nat8),
		network: BitcoinNetwork,
		address: IDL.Text,
		utxos: IDL.Vec(Utxo)
	});
	const BtcAddPendingTransactionError = IDL.Variant({
		InternalError: IDL.Record({ msg: IDL.Text })
	});
	const Result_2 = IDL.Variant({
		Ok: IDL.Null,
		Err: BtcAddPendingTransactionError
	});
	const BtcGetPendingTransactionsRequest = IDL.Record({
		network: BitcoinNetwork,
		address: IDL.Text
	});
	const PendingTransaction = IDL.Record({
		txid: IDL.Vec(IDL.Nat8),
		utxos: IDL.Vec(Utxo)
	});
	const BtcGetPendingTransactionsReponse = IDL.Record({
		transactions: IDL.Vec(PendingTransaction)
	});
	const Result_3 = IDL.Variant({
		Ok: BtcGetPendingTransactionsReponse,
		Err: BtcAddPendingTransactionError
	});
	const SelectedUtxosFeeRequest = IDL.Record({
		network: BitcoinNetwork,
		amount_satoshis: IDL.Nat64,
		min_confirmations: IDL.Opt(IDL.Nat32)
	});
	const SelectedUtxosFeeResponse = IDL.Record({
		fee_satoshis: IDL.Nat64,
		utxos: IDL.Vec(Utxo)
	});
	const SelectedUtxosFeeError = IDL.Variant({
		PendingTransactions: IDL.Null,
		InternalError: IDL.Record({ msg: IDL.Text })
	});
	const Result_4 = IDL.Variant({
		Ok: SelectedUtxosFeeResponse,
		Err: SelectedUtxosFeeError
	});
	const Config = IDL.Record({
		derivation_origin: IDL.Opt(IDL.Text),
		ecdsa_key_name: IDL.Text,
		cfs_canister_id: IDL.Opt(IDL.Principal),
		allowed_callers: IDL.Vec(IDL.Principal),
		supported_credentials: IDL.Opt(IDL.Vec(SupportedCredential)),
		ic_root_key_raw: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const CreateChallengeResponse = IDL.Record({
		difficulty: IDL.Nat32,
		start_timestamp_ms: IDL.Nat64,
		expiry_timestamp_ms: IDL.Nat64
	});
	const CreateChallengeError = IDL.Variant({
		ChallengeInProgress: IDL.Null,
		MissingUserProfile: IDL.Null,
		RandomnessError: IDL.Text,
		Other: IDL.Text
	});
	const Result_5 = IDL.Variant({
		Ok: CreateChallengeResponse,
		Err: CreateChallengeError
	});
	const UserCredential = IDL.Record({
		issuer: IDL.Text,
		verified_date_timestamp: IDL.Opt(IDL.Nat64),
		credential_type: CredentialType
	});
	const NetworkSettingsFor = IDL.Variant({
		InternetComputer: IDL.Null,
		BaseSepolia: IDL.Null,
		SolanaTestnet: IDL.Null,
		BitcoinRegtest: IDL.Null,
		SolanaDevnet: IDL.Null,
		EthereumSepolia: IDL.Null,
		BitcoinTestnet: IDL.Null,
		BaseMainnet: IDL.Null,
		BscMainnet: IDL.Null,
		SolanaLocal: IDL.Null,
		EthereumMainnet: IDL.Null,
		SolanaMainnet: IDL.Null,
		BitcoinMainnet: IDL.Null,
		BscTestnet: IDL.Null
	});
	const NetworkSettings = IDL.Record({
		enabled: IDL.Bool,
		is_testnet: IDL.Bool
	});
	const TestnetsSettings = IDL.Record({ show_testnets: IDL.Bool });
	const NetworksSettings = IDL.Record({
		networks: IDL.Vec(IDL.Tuple(NetworkSettingsFor, NetworkSettings)),
		testnets: TestnetsSettings
	});
	const DappCarouselSettings = IDL.Record({
		hidden_dapp_ids: IDL.Vec(IDL.Text)
	});
	const DappSettings = IDL.Record({ dapp_carousel: DappCarouselSettings });
	const Settings = IDL.Record({
		networks: NetworksSettings,
		dapp: DappSettings
	});
	const UserProfile = IDL.Record({
		credentials: IDL.Vec(UserCredential),
		version: IDL.Opt(IDL.Nat64),
		settings: IDL.Opt(Settings),
		created_timestamp: IDL.Nat64,
		updated_timestamp: IDL.Nat64
	});
	const GetAllowedCyclesResponse = IDL.Record({ allowed_cycles: IDL.Nat });
	const GetAllowedCyclesError = IDL.Variant({
		Other: IDL.Text,
		FailedToContactCyclesLedger: IDL.Null
	});
	const Result_6 = IDL.Variant({
		Ok: GetAllowedCyclesResponse,
		Err: GetAllowedCyclesError
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
	const EthAddress = IDL.Variant({ Public: IDL.Text });
	const TransactionType = IDL.Variant({
		Send: IDL.Null,
		Receive: IDL.Null
	});
	const Transaction = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: EthAddress,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot = IDL.Record({
		decimals: IDL.Nat8,
		token_address: EthAddress,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction),
		account: EthAddress,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const Transaction_1 = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot_1 = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IDL.Text,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_1),
		account: IDL.Text,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const BtcTokenId = IDL.Variant({ Native: IDL.Null });
	const BtcAddress = IDL.Variant({
		P2WPKH: IDL.Text,
		P2PKH: IDL.Text,
		P2WSH: IDL.Text,
		P2SH: IDL.Text,
		P2TR: IDL.Text
	});
	const Transaction_2 = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: BtcAddress,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot_2 = IDL.Record({
		decimals: IDL.Nat8,
		token_address: BtcTokenId,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_2),
		account: BtcAddress,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const IcrcTokenId = IDL.Variant({
		Icrc: IDL.Record({
			ledger: IDL.Principal,
			index: IDL.Opt(IDL.Principal)
		}),
		Native: IDL.Null
	});
	const Icrcv2AccountId = IDL.Variant({
		Account: IDL.Vec(IDL.Nat8),
		WithPrincipal: IDL.Record({
			owner: IDL.Principal,
			subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
		})
	});
	const Transaction_3 = IDL.Record({
		transaction_type: TransactionType,
		network: IDL.Record({}),
		counterparty: Icrcv2AccountId,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshot_3 = IDL.Record({
		decimals: IDL.Nat8,
		token_address: IcrcTokenId,
		network: IDL.Record({}),
		approx_usd_per_token: IDL.Float64,
		last_transactions: IDL.Vec(Transaction_3),
		account: Icrcv2AccountId,
		timestamp: IDL.Nat64,
		amount: IDL.Nat64
	});
	const AccountSnapshotFor = IDL.Variant({
		Erc20Sepolia: AccountSnapshot,
		EthSepolia: AccountSnapshot,
		SplTestnet: AccountSnapshot_1,
		BtcMainnet: AccountSnapshot_2,
		SolDevnet: AccountSnapshot_1,
		Erc20Mainnet: AccountSnapshot,
		SolTestnet: AccountSnapshot_1,
		Icrcv2: AccountSnapshot_3,
		BtcRegtest: AccountSnapshot_2,
		SplDevnet: AccountSnapshot_1,
		EthMainnet: AccountSnapshot,
		SplMainnet: AccountSnapshot_1,
		SolLocal: AccountSnapshot_1,
		BtcTestnet: AccountSnapshot_2,
		SplLocal: AccountSnapshot_1,
		SolMainnet: AccountSnapshot_1
	});
	const UserSnapshot = IDL.Record({
		accounts: IDL.Vec(AccountSnapshotFor),
		timestamp: IDL.Opt(IDL.Nat64)
	});
	const GetUserProfileError = IDL.Variant({ NotFound: IDL.Null });
	const Result_7 = IDL.Variant({
		Ok: UserProfile,
		Err: GetUserProfileError
	});
	const HasUserProfileResponse = IDL.Record({ has_user_profile: IDL.Bool });
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
	const SplToken = IDL.Record({
		decimals: IDL.Opt(IDL.Nat8),
		token_address: IDL.Text,
		symbol: IDL.Opt(IDL.Text)
	});
	const Token = IDL.Variant({
		Icrc: IcrcToken,
		SplDevnet: SplToken,
		SplMainnet: SplToken
	});
	const CustomToken = IDL.Record({
		token: Token,
		version: IDL.Opt(IDL.Nat64),
		enabled: IDL.Bool
	});
	const ListUsersRequest = IDL.Record({
		updated_after_timestamp: IDL.Opt(IDL.Nat64),
		matches_max_length: IDL.Opt(IDL.Nat64)
	});
	const ListUserCreationTimestampsResponse = IDL.Record({
		creation_timestamps: IDL.Vec(IDL.Nat64),
		matches_max_length: IDL.Nat64
	});
	const UserToken = IDL.Record({
		decimals: IDL.Opt(IDL.Nat8),
		version: IDL.Opt(IDL.Nat64),
		enabled: IDL.Opt(IDL.Bool),
		chain_id: IDL.Nat64,
		contract_address: IDL.Text,
		symbol: IDL.Opt(IDL.Text)
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
	const UserTokenId = IDL.Record({
		chain_id: IDL.Nat64,
		contract_address: IDL.Text
	});
	const SetShowTestnetsRequest = IDL.Record({
		current_user_version: IDL.Opt(IDL.Nat64),
		show_testnets: IDL.Bool
	});
	const SaveTestnetsSettingsError = IDL.Variant({
		VersionMismatch: IDL.Null,
		UserNotFound: IDL.Null
	});
	const Result_8 = IDL.Variant({
		Ok: IDL.Null,
		Err: SaveTestnetsSettingsError
	});
	const Stats = IDL.Record({
		user_profile_count: IDL.Nat64,
		custom_token_count: IDL.Nat64,
		user_timestamps_count: IDL.Nat64,
		user_token_count: IDL.Nat64
	});
	const TopUpCyclesLedgerRequest = IDL.Record({
		threshold: IDL.Opt(IDL.Nat),
		percentage: IDL.Opt(IDL.Nat8)
	});
	const TopUpCyclesLedgerResponse = IDL.Record({
		backend_cycles: IDL.Nat,
		ledger_balance: IDL.Nat,
		topped_up: IDL.Nat
	});
	const TopUpCyclesLedgerError = IDL.Variant({
		InvalidArgPercentageOutOfRange: IDL.Record({
			max: IDL.Nat8,
			min: IDL.Nat8,
			percentage: IDL.Nat8
		}),
		CouldNotGetBalanceFromCyclesLedger: IDL.Null,
		CouldNotTopUpCyclesLedger: IDL.Record({
			tried_to_send: IDL.Nat,
			available: IDL.Nat
		})
	});
	const Result_9 = IDL.Variant({
		Ok: TopUpCyclesLedgerResponse,
		Err: TopUpCyclesLedgerError
	});
	const SaveNetworksSettingsRequest = IDL.Record({
		networks: IDL.Vec(IDL.Tuple(NetworkSettingsFor, NetworkSettings)),
		current_user_version: IDL.Opt(IDL.Nat64)
	});
	return IDL.Service({
		add_user_credential: IDL.Func([AddUserCredentialRequest], [AddUserCredentialResult], []),
		add_user_hidden_dapp_id: IDL.Func([AddHiddenDappIdRequest], [Result], []),
		allow_signing: IDL.Func([IDL.Opt(AllowSigningRequest)], [Result_1], []),
		btc_add_pending_transaction: IDL.Func([BtcAddPendingTransactionRequest], [Result_2], []),
		btc_get_pending_transactions: IDL.Func([BtcGetPendingTransactionsRequest], [Result_3], []),
		btc_select_user_utxos_fee: IDL.Func([SelectedUtxosFeeRequest], [Result_4], []),
		config: IDL.Func([], [Config], ['query']),
		create_pow_challenge: IDL.Func([], [Result_5], []),
		create_user_profile: IDL.Func([], [UserProfile], []),
		get_account_creation_timestamps: IDL.Func(
			[],
			[IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64))],
			['query']
		),
		get_allowed_cycles: IDL.Func([], [Result_6], []),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		get_snapshot: IDL.Func([], [IDL.Opt(UserSnapshot)], ['query']),
		get_user_profile: IDL.Func([], [Result_7], ['query']),
		has_user_profile: IDL.Func([], [HasUserProfileResponse], ['query']),
		http_request: IDL.Func([HttpRequest], [HttpResponse], ['query']),
		list_custom_tokens: IDL.Func([], [IDL.Vec(CustomToken)], ['query']),
		list_user_creation_timestamps: IDL.Func(
			[ListUsersRequest],
			[ListUserCreationTimestampsResponse],
			['query']
		),
		list_user_tokens: IDL.Func([], [IDL.Vec(UserToken)], ['query']),
		list_users: IDL.Func([ListUsersRequest], [ListUsersResponse], ['query']),
		remove_user_token: IDL.Func([UserTokenId], [], []),
		set_custom_token: IDL.Func([CustomToken], [], []),
		set_many_custom_tokens: IDL.Func([IDL.Vec(CustomToken)], [], []),
		set_many_user_tokens: IDL.Func([IDL.Vec(UserToken)], [], []),
		set_snapshot: IDL.Func([UserSnapshot], [], []),
		set_user_show_testnets: IDL.Func([SetShowTestnetsRequest], [Result_8], []),
		set_user_token: IDL.Func([UserToken], [], []),
		stats: IDL.Func([], [Stats], ['query']),
		top_up_cycles_ledger: IDL.Func([IDL.Opt(TopUpCyclesLedgerRequest)], [Result_9], []),
		update_user_network_settings: IDL.Func([SaveNetworksSettingsRequest], [Result_8], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const CredentialType = IDL.Variant({ ProofOfUniqueness: IDL.Null });
	const SupportedCredential = IDL.Record({
		ii_canister_id: IDL.Principal,
		issuer_origin: IDL.Text,
		issuer_canister_id: IDL.Principal,
		ii_origin: IDL.Text,
		credential_type: CredentialType
	});
	const InitArg = IDL.Record({
		derivation_origin: IDL.Opt(IDL.Text),
		ecdsa_key_name: IDL.Text,
		cfs_canister_id: IDL.Opt(IDL.Principal),
		allowed_callers: IDL.Vec(IDL.Principal),
		supported_credentials: IDL.Opt(IDL.Vec(SupportedCredential)),
		ic_root_key_der: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
