export const idlFactory = ({ IDL }: { IDL: any }) => {
	const Token = IDL.Record({
		address: IDL.Text,
		standard: IDL.Text
	});

	const GetPoolArgs = IDL.Record({
		fee: IDL.Nat,
		token0: Token,
		token1: Token
	});

	const PoolData = IDL.Record({
		fee: IDL.Nat,
		key: IDL.Text,
		tickSpacing: IDL.Int,
		token0: Token,
		token1: Token,
		canisterId: IDL.Principal
	});

	const Error = IDL.Variant({
		CommonError: IDL.Null,
		InternalError: IDL.Text,
		UnsupportedToken: IDL.Text,
		InsufficientFunds: IDL.Null
	});

	const Result = IDL.Variant({ ok: IDL.Nat, err: Error });
	const Result_2 = IDL.Variant({ ok: IDL.Vec(PoolData), err: Error });
	const Result_3 = IDL.Variant({ ok: PoolData, err: Error });

	const SwapArgs = IDL.Record({
		amountIn: IDL.Text,
		zeroForOne: IDL.Bool,
		amountOutMinimum: IDL.Text
	});

	const DepositArgs = IDL.Record({
		fee: IDL.Nat,
		token: IDL.Text,
		amount: IDL.Nat
	});

	const WithdrawArgs = IDL.Record({
		fee: IDL.Nat,
		token: IDL.Text,
		amount: IDL.Nat
	});

	return IDL.Service({
		getPool: IDL.Func([GetPoolArgs], [Result_3], ['query']),
		getPools: IDL.Func([], [Result_2], ['query']),
		quote: IDL.Func([SwapArgs], [Result], ['query']),
		swap: IDL.Func([SwapArgs], [Result], []),
		deposit: IDL.Func([DepositArgs], [Result], []),
		depositFrom: IDL.Func([DepositArgs], [Result], []),
		withdraw: IDL.Func([WithdrawArgs], [Result], []),
		getUserUnusedBalance: IDL.Func(
			[IDL.Principal],
			[
				IDL.Variant({
					ok: IDL.Record({
						balance0: IDL.Nat,
						balance1: IDL.Nat
					}),
					err: Error
				})
			],
			['query']
		)
	});
};
