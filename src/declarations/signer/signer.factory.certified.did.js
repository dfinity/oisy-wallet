// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		ic_root_key_der: IDL.Opt(IDL.Vec(IDL.Nat8)),
		cycles_ledger: IDL.Opt(IDL.Principal)
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	const BitcoinNetwork = IDL.Variant({
		mainnet: IDL.Null,
		regtest: IDL.Null,
		testnet: IDL.Null
	});
	const BitcoinAddressType = IDL.Variant({ P2WPKH: IDL.Null });
	const GetAddressRequest = IDL.Record({
		network: BitcoinNetwork,
		address_type: BitcoinAddressType
	});
	const Account = IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
	});
	const PatronPaysIcrc2Tokens = IDL.Record({
		ledger: IDL.Principal,
		patron: Account
	});
	const CallerPaysIcrc2Tokens = IDL.Record({ ledger: IDL.Principal });
	const PaymentType = IDL.Variant({
		PatronPaysIcrc2Tokens: PatronPaysIcrc2Tokens,
		AttachedCycles: IDL.Null,
		CallerPaysIcrc2Cycles: IDL.Null,
		CallerPaysIcrc2Tokens: CallerPaysIcrc2Tokens,
		PatronPaysIcrc2Cycles: Account
	});
	const GetAddressResponse = IDL.Record({ address: IDL.Text });
	const RejectionCode_1 = IDL.Variant({
		NoError: IDL.Null,
		CanisterError: IDL.Null,
		SysTransient: IDL.Null,
		DestinationInvalid: IDL.Null,
		Unknown: IDL.Null,
		SysFatal: IDL.Null,
		CanisterReject: IDL.Null
	});
	const WithdrawFromError = IDL.Variant({
		GenericError: IDL.Record({
			message: IDL.Text,
			error_code: IDL.Nat
		}),
		TemporarilyUnavailable: IDL.Null,
		InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
		Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
		InvalidReceiver: IDL.Record({ receiver: IDL.Principal }),
		CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
		TooOld: IDL.Null,
		FailedToWithdrawFrom: IDL.Record({
			withdraw_from_block: IDL.Opt(IDL.Nat),
			rejection_code: RejectionCode_1,
			refund_block: IDL.Opt(IDL.Nat),
			approval_refund_block: IDL.Opt(IDL.Nat),
			rejection_reason: IDL.Text
		}),
		InsufficientFunds: IDL.Record({ balance: IDL.Nat })
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
	const PaymentError = IDL.Variant({
		LedgerWithdrawFromError: IDL.Record({
			error: WithdrawFromError,
			ledger: IDL.Principal
		}),
		LedgerUnreachable: CallerPaysIcrc2Tokens,
		LedgerTransferFromError: IDL.Record({
			error: TransferFromError,
			ledger: IDL.Principal
		}),
		UnsupportedPaymentType: IDL.Null,
		InsufficientFunds: IDL.Record({
			needed: IDL.Nat64,
			available: IDL.Nat64
		})
	});
	const GetAddressError = IDL.Variant({
		InternalError: IDL.Record({ msg: IDL.Text }),
		PaymentError: PaymentError
	});
	const Result = IDL.Variant({
		Ok: GetAddressResponse,
		Err: GetAddressError
	});
	const GetBalanceResponse = IDL.Record({ balance: IDL.Nat64 });
	const Result_1 = IDL.Variant({
		Ok: GetBalanceResponse,
		Err: GetAddressError
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
	const BtcTxOutput = IDL.Record({
		destination_address: IDL.Text,
		sent_satoshis: IDL.Nat64
	});
	const SendBtcRequest = IDL.Record({
		fee_satoshis: IDL.Opt(IDL.Nat64),
		network: BitcoinNetwork,
		utxos_to_spend: IDL.Vec(Utxo),
		address_type: BitcoinAddressType,
		outputs: IDL.Vec(BtcTxOutput)
	});
	const SendBtcResponse = IDL.Record({ txid: IDL.Text });
	const SendBtcError = IDL.Variant({
		InternalError: IDL.Record({ msg: IDL.Text }),
		PaymentError: PaymentError
	});
	const Result_2 = IDL.Variant({
		Ok: SendBtcResponse,
		Err: SendBtcError
	});
	const Config = IDL.Record({
		ecdsa_key_name: IDL.Text,
		ic_root_key_raw: IDL.Opt(IDL.Vec(IDL.Nat8)),
		cycles_ledger: IDL.Principal
	});
	const GenericSigningError = IDL.Variant({
		SigningError: IDL.Tuple(RejectionCode_1, IDL.Text),
		PaymentError: PaymentError
	});
	const Result_3 = IDL.Variant({
		Ok: IDL.Text,
		Err: GenericSigningError
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
	const EcdsaCurve = IDL.Variant({ secp256k1: IDL.Null });
	const EcdsaKeyId = IDL.Record({ name: IDL.Text, curve: EcdsaCurve });
	const EcdsaPublicKeyArgument = IDL.Record({
		key_id: EcdsaKeyId,
		canister_id: IDL.Opt(IDL.Principal),
		derivation_path: IDL.Vec(IDL.Vec(IDL.Nat8))
	});
	const EcdsaPublicKeyResponse = IDL.Record({
		public_key: IDL.Vec(IDL.Nat8),
		chain_code: IDL.Vec(IDL.Nat8)
	});
	const Result_4 = IDL.Variant({
		Ok: IDL.Tuple(EcdsaPublicKeyResponse),
		Err: GenericSigningError
	});
	const SignWithEcdsaArgument = IDL.Record({
		key_id: EcdsaKeyId,
		derivation_path: IDL.Vec(IDL.Vec(IDL.Nat8)),
		message_hash: IDL.Vec(IDL.Nat8)
	});
	const SignWithEcdsaResponse = IDL.Record({ signature: IDL.Vec(IDL.Nat8) });
	const Result_5 = IDL.Variant({
		Ok: IDL.Tuple(SignWithEcdsaResponse),
		Err: GenericSigningError
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
	return IDL.Service({
		btc_caller_address: IDL.Func([GetAddressRequest, IDL.Opt(PaymentType)], [Result], []),
		btc_caller_balance: IDL.Func([GetAddressRequest, IDL.Opt(PaymentType)], [Result_1], []),
		btc_caller_send: IDL.Func([SendBtcRequest, IDL.Opt(PaymentType)], [Result_2], []),
		caller_eth_address: IDL.Func([], [IDL.Text], []),
		config: IDL.Func([], [Config]),
		eth_address_of: IDL.Func([IDL.Principal], [IDL.Text], []),
		eth_address_of_caller: IDL.Func([IDL.Opt(PaymentType)], [Result_3], []),
		eth_address_of_principal: IDL.Func([IDL.Principal, IDL.Opt(PaymentType)], [Result_3], []),
		eth_personal_sign: IDL.Func([IDL.Text, IDL.Opt(PaymentType)], [Result_3], []),
		eth_sign_transaction: IDL.Func([SignRequest, IDL.Opt(PaymentType)], [Result_3], []),
		generic_caller_ecdsa_public_key: IDL.Func(
			[EcdsaPublicKeyArgument, IDL.Opt(PaymentType)],
			[Result_4],
			[]
		),
		generic_sign_with_ecdsa: IDL.Func(
			[IDL.Opt(PaymentType), SignWithEcdsaArgument],
			[Result_5],
			[]
		),
		get_canister_status: IDL.Func([], [CanisterStatusResultV2], []),
		http_request: IDL.Func([HttpRequest], [HttpResponse]),
		personal_sign: IDL.Func([IDL.Text], [IDL.Text], []),
		sign_prehash: IDL.Func([IDL.Text], [IDL.Text], []),
		sign_transaction: IDL.Func([SignRequest], [IDL.Text], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({
		ecdsa_key_name: IDL.Text,
		ic_root_key_der: IDL.Opt(IDL.Vec(IDL.Nat8)),
		cycles_ledger: IDL.Opt(IDL.Principal)
	});
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
