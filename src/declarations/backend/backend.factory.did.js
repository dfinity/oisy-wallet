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
	const AddUserHiddenDappIdResult = IDL.Variant({
		Ok: IDL.Null,
		Err: AddDappSettingsError
	});
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
	const AllowSigningResult = IDL.Variant({
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
	const BtcAddPendingTransactionResult = IDL.Variant({
		Ok: IDL.Null,
		Err: BtcAddPendingTransactionError
	});
	const BtcGetFeePercentilesRequest = IDL.Record({
		network: BitcoinNetwork
	});
	const BtcGetFeePercentilesResponse = IDL.Record({
		fee_percentiles: IDL.Vec(IDL.Nat64)
	});
	const SelectedUtxosFeeError = IDL.Variant({
		PendingTransactions: IDL.Null,
		InternalError: IDL.Record({ msg: IDL.Text })
	});
	const BtcGetFeePercentilesResult = IDL.Variant({
		Ok: BtcGetFeePercentilesResponse,
		Err: SelectedUtxosFeeError
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
	const BtcGetPendingTransactionsResult = IDL.Variant({
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
	const BtcSelectUserUtxosFeeResult = IDL.Variant({
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
	const ImageMimeType = IDL.Variant({
		'image/gif': IDL.Null,
		'image/png': IDL.Null,
		'image/jpeg': IDL.Null,
		'image/webp': IDL.Null
	});
	const ContactImage = IDL.Record({
		data: IDL.Vec(IDL.Nat8),
		mime_type: ImageMimeType
	});
	const CreateContactRequest = IDL.Record({
		name: IDL.Text,
		image: IDL.Opt(ContactImage)
	});
	const BtcAddress = IDL.Variant({
		P2WPKH: IDL.Text,
		P2PKH: IDL.Text,
		P2WSH: IDL.Text,
		P2SH: IDL.Text,
		P2TR: IDL.Text
	});
	const EthAddress = IDL.Variant({ Public: IDL.Text });
	const Icrcv2AccountId = IDL.Variant({
		Account: IDL.Vec(IDL.Nat8),
		WithPrincipal: IDL.Record({
			owner: IDL.Principal,
			subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
		})
	});
	const TokenAccountId = IDL.Variant({
		Btc: BtcAddress,
		Eth: EthAddress,
		Sol: IDL.Text,
		Icrcv2: Icrcv2AccountId
	});
	const ContactAddressData = IDL.Record({
		label: IDL.Opt(IDL.Text),
		token_account_id: TokenAccountId
	});
	const Contact = IDL.Record({
		id: IDL.Nat64,
		name: IDL.Text,
		update_timestamp_ns: IDL.Nat64,
		addresses: IDL.Vec(ContactAddressData),
		image: IDL.Opt(ContactImage)
	});
	const ContactError = IDL.Variant({
		InvalidContactData: IDL.Null,
		CanisterMemoryNearCapacity: IDL.Null,
		InvalidImageFormat: IDL.Null,
		ContactNotFound: IDL.Null,
		ImageTooLarge: IDL.Null,
		RandomnessError: IDL.Null,
		ImageExceedsMaxSize: IDL.Null,
		CanisterStatusError: IDL.Null,
		TooManyContactsWithImages: IDL.Null
	});
	const CreateContactResult = IDL.Variant({
		Ok: Contact,
		Err: ContactError
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
	const CreatePowChallengeResult = IDL.Variant({
		Ok: CreateChallengeResponse,
		Err: CreateChallengeError
	});
	const UserAgreement = IDL.Record({
		last_accepted_at_ns: IDL.Opt(IDL.Nat64),
		accepted: IDL.Opt(IDL.Bool),
		last_updated_at_ms: IDL.Opt(IDL.Nat64)
	});
	const UserAgreements = IDL.Record({
		license_agreement: UserAgreement,
		privacy_policy: UserAgreement,
		terms_of_use: UserAgreement
	});
	const Agreements = IDL.Record({ agreements: UserAgreements });
	const UserCredential = IDL.Record({
		issuer: IDL.Text,
		verified_date_timestamp: IDL.Opt(IDL.Nat64),
		credential_type: CredentialType
	});
	const NetworkSettingsFor = IDL.Variant({
		ArbitrumMainnet: IDL.Null,
		InternetComputer: IDL.Null,
		BaseSepolia: IDL.Null,
		PolygonMainnet: IDL.Null,
		BitcoinRegtest: IDL.Null,
		SolanaDevnet: IDL.Null,
		PolygonAmoy: IDL.Null,
		EthereumSepolia: IDL.Null,
		BitcoinTestnet: IDL.Null,
		BaseMainnet: IDL.Null,
		BscMainnet: IDL.Null,
		SolanaLocal: IDL.Null,
		ArbitrumSepolia: IDL.Null,
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
		agreements: IDL.Opt(Agreements),
		credentials: IDL.Vec(UserCredential),
		version: IDL.Opt(IDL.Nat64),
		settings: IDL.Opt(Settings),
		created_timestamp: IDL.Nat64,
		updated_timestamp: IDL.Nat64
	});
	const DeleteContactResult = IDL.Variant({
		Ok: IDL.Nat64,
		Err: ContactError
	});
	const GetAllowedCyclesResponse = IDL.Record({ allowed_cycles: IDL.Nat });
	const GetAllowedCyclesError = IDL.Variant({
		Other: IDL.Text,
		FailedToContactCyclesLedger: IDL.Null
	});
	const GetAllowedCyclesResult = IDL.Variant({
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
	const GetContactResult = IDL.Variant({
		Ok: Contact,
		Err: ContactError
	});
	const GetContactsResult = IDL.Variant({
		Ok: IDL.Vec(Contact),
		Err: ContactError
	});
	const GetUserProfileError = IDL.Variant({ NotFound: IDL.Null });
	const GetUserProfileResult = IDL.Variant({
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
	const ErcToken = IDL.Record({
		token_address: IDL.Text,
		chain_id: IDL.Nat64,
		allow_media_source: IDL.Opt(IDL.Bool)
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
		Erc20: ErcToken,
		Icrc: IcrcToken,
		Erc721: ErcToken,
		SplDevnet: SplToken,
		SplMainnet: SplToken,
		Erc1155: ErcToken
	});
	const TokenSection = IDL.Variant({ Spam: IDL.Null, Hidden: IDL.Null });
	const CustomToken = IDL.Record({
		token: Token,
		section: IDL.Opt(TokenSection),
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
	const SetShowTestnetsRequest = IDL.Record({
		current_user_version: IDL.Opt(IDL.Nat64),
		show_testnets: IDL.Bool
	});
	const SaveTestnetsSettingsError = IDL.Variant({
		VersionMismatch: IDL.Null,
		UserNotFound: IDL.Null
	});
	const SetUserShowTestnetsResult = IDL.Variant({
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
	const TopUpCyclesLedgerResult = IDL.Variant({
		Ok: TopUpCyclesLedgerResponse,
		Err: TopUpCyclesLedgerError
	});
	const SaveNetworksSettingsRequest = IDL.Record({
		networks: IDL.Vec(IDL.Tuple(NetworkSettingsFor, NetworkSettings)),
		current_user_version: IDL.Opt(IDL.Nat64)
	});
	return IDL.Service({
		add_user_credential: IDL.Func([AddUserCredentialRequest], [AddUserCredentialResult], []),
		add_user_hidden_dapp_id: IDL.Func([AddHiddenDappIdRequest], [AddUserHiddenDappIdResult], []),
		allow_signing: IDL.Func([IDL.Opt(AllowSigningRequest)], [AllowSigningResult], []),
		btc_add_pending_transaction: IDL.Func(
			[BtcAddPendingTransactionRequest],
			[BtcAddPendingTransactionResult],
			[]
		),
		btc_get_current_fee_percentiles: IDL.Func(
			[BtcGetFeePercentilesRequest],
			[BtcGetFeePercentilesResult],
			['query']
		),
		btc_get_pending_transactions: IDL.Func(
			[BtcGetPendingTransactionsRequest],
			[BtcGetPendingTransactionsResult],
			[]
		),
		btc_select_user_utxos_fee: IDL.Func(
			[SelectedUtxosFeeRequest],
			[BtcSelectUserUtxosFeeResult],
			[]
		),
		config: IDL.Func([], [Config], ['query']),
		create_contact: IDL.Func([CreateContactRequest], [CreateContactResult], []),
		create_pow_challenge: IDL.Func([], [CreatePowChallengeResult], []),
		create_user_profile: IDL.Func([], [UserProfile], []),
		delete_contact: IDL.Func([IDL.Nat64], [DeleteContactResult], []),
		get_account_creation_timestamps: IDL.Func(
			[],
			[IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64))],
			['query']
		),
		get_allowed_cycles: IDL.Func([], [GetAllowedCyclesResult], []),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		get_contact: IDL.Func([IDL.Nat64], [GetContactResult], ['query']),
		get_contacts: IDL.Func([], [GetContactsResult], ['query']),
		get_user_profile: IDL.Func([], [GetUserProfileResult], ['query']),
		has_user_profile: IDL.Func([], [HasUserProfileResponse], ['query']),
		http_request: IDL.Func([HttpRequest], [HttpResponse], ['query']),
		list_custom_tokens: IDL.Func([], [IDL.Vec(CustomToken)], ['query']),
		list_user_tokens: IDL.Func([], [IDL.Vec(UserToken)], ['query']),
		remove_custom_token: IDL.Func([CustomToken], [], []),
		remove_user_token: IDL.Func([UserTokenId], [], []),
		set_custom_token: IDL.Func([CustomToken], [], []),
		set_many_custom_tokens: IDL.Func([IDL.Vec(CustomToken)], [], []),
		set_many_user_tokens: IDL.Func([IDL.Vec(UserToken)], [], []),
		set_user_show_testnets: IDL.Func([SetShowTestnetsRequest], [SetUserShowTestnetsResult], []),
		set_user_token: IDL.Func([UserToken], [], []),
		stats: IDL.Func([], [Stats], ['query']),
		top_up_cycles_ledger: IDL.Func(
			[IDL.Opt(TopUpCyclesLedgerRequest)],
			[TopUpCyclesLedgerResult],
			[]
		),
		update_contact: IDL.Func([Contact], [GetContactResult], []),
		update_user_network_settings: IDL.Func(
			[SaveNetworksSettingsRequest],
			[SetUserShowTestnetsResult],
			[]
		)
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
