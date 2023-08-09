// @ts-ignore
export const idlFactory = ({ IDL }) => {
	const InitArg = IDL.Record({ ecdsa_key_name: IDL.Text });
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	const SignRequest = IDL.Record({
		to: IDL.Text,
		gas: IDL.Nat,
		value: IDL.Nat,
		chain_id: IDL.Nat,
		nonce: IDL.Nat,
		gas_price: IDL.Nat
	});
	return IDL.Service({
		caller_eth_address: IDL.Func([], [IDL.Text], []),
		sign_transaction: IDL.Func([SignRequest], [IDL.Text], [])
	});
};
// @ts-ignore
export const init = ({ IDL }) => {
	const InitArg = IDL.Record({ ecdsa_key_name: IDL.Text });
	const Arg = IDL.Variant({ Upgrade: IDL.Null, Init: InitArg });
	return [Arg];
};
