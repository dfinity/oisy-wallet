import { getAgent } from '$lib/actors/agents.ic';
import { type Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createServices } from '@dfinity/utils';

type TxReceipt =
	| { Ok: bigint }
	| {
			Err:
				| { InsufficientAllowance: null }
				| { InsufficientBalance: null }
				| { ErrorOperationStyle: null }
				| { Unauthorized: null }
				| { LedgerTrap: null }
				| { ErrorTo: null }
				| { Other: string }
				| { BlockUsed: null }
				| { AmountTooSmall: null };
	  };

interface _SERVICE {
	transfer: (arg_0: Principal, arg_1: bigint) => Promise<TxReceipt>;
}

const idlFactoryXTC = ({ IDL }: any) => {
	const TxReceipt = IDL.Variant({
		Ok: IDL.Nat,
		Err: IDL.Variant({
			InsufficientAllowance: IDL.Null,
			InsufficientBalance: IDL.Null,
			ErrorOperationStyle: IDL.Null,
			Unauthorized: IDL.Null,
			LedgerTrap: IDL.Null,
			ErrorTo: IDL.Null,
			Other: IDL.Text,
			BlockUsed: IDL.Null,
			AmountTooSmall: IDL.Null
		})
	});
	return IDL.Service({
		transfer: IDL.Func([IDL.Principal, IDL.Nat], [TxReceipt], [])
	});
};

export const transferXtc = async (identity: Identity, to: string, amount: bigint) => {
	const agent = await getAgent({ identity });
	const xtcCanisterId = 'aanaa-xaaaa-aaaah-aaeiq-cai';

	const { service } = createServices<_SERVICE>({
		options: {
			canisterId: Principal.fromText(xtcCanisterId),
			agent
		},
		idlFactory: idlFactoryXTC,
		certifiedIdlFactory: idlFactoryXTC
	});

	const result = await service.transfer(Principal.fromText(to), amount);
	console.info(result);
};
