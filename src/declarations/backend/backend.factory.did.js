// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({ ecdsa_key_name: IDL.Text });
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
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
		personal_sign: IDL.Func([IDL.Text], [IDL.Text], []),
		sign_transaction: IDL.Func([SignRequest], [IDL.Text], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({ ecdsa_key_name: IDL.Text });
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
