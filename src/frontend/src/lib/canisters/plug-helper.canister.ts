import type {
	BtcNetwork,
	_SERVICE as PlugHelperService,
	Result,
	Utxo
} from '$declarations/plug_helper/plug_helper.did';
import { idlFactory as idlCertifiedFactoryPlugHelper } from '$declarations/plug_helper/plug_helper.factory.certified.did';
import { idlFactory as idlFactoryPlugHelper } from '$declarations/plug_helper/plug_helper.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

/**
 * The imported wallet's Chain Fusion helper canister.
 *
 * Its BTC / EVM / SOL keys are threshold keys rooted in this canister id, and
 * `sign_with_*` on the management canister derives from the *caller*, so this
 * canister is the only party that can ever produce those signatures. Every call
 * here must therefore be made with the imported identity, not the signed-in one.
 *
 * All signing methods are invoked with `{ Sign: null }`: the canister returns a
 * signed transaction and OISY broadcasts it through its own providers. The
 * canister also offers a `Send` mode that broadcasts for us, deliberately unused
 * — keeping broadcast on our side means we see the transaction hash and the RPC
 * error directly, and a third party stays off the critical path for everything
 * but the signature itself.
 */
export class PlugHelperCanister extends Canister<PlugHelperService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<PlugHelperService>): Promise<PlugHelperCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<PlugHelperService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryPlugHelper,
			certifiedIdlFactory: idlCertifiedFactoryPlugHelper
		});

		return new PlugHelperCanister(canisterId, service, certifiedService);
	}

	signEthTransaction = async ({
		to,
		amount,
		gasLimit,
		maxFeePerGas,
		maxPriorityFeePerGas,
		nonce,
		chainId
	}: {
		to: string;
		amount: bigint;
		gasLimit: bigint;
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
		nonce: bigint;
		chainId: bigint;
	}): Promise<string> => {
		const { send_eth } = this.caller({ certified: true });

		return unwrap(
			await send_eth(
				{ Sign: null },
				to,
				amount,
				gasLimit,
				maxFeePerGas,
				maxPriorityFeePerGas,
				nonce,
				chainId
			)
		);
	};

	signErc20Transaction = async ({
		amount,
		gasLimit,
		maxFeePerGas,
		maxPriorityFeePerGas,
		nonce,
		chainId,
		contractAddress,
		to
	}: {
		amount: bigint;
		gasLimit: bigint;
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
		nonce: bigint;
		chainId: bigint;
		contractAddress: string;
		to: string;
	}): Promise<string> => {
		const { send_erc20 } = this.caller({ certified: true });

		return unwrap(
			await send_erc20(
				{ Sign: null },
				amount,
				gasLimit,
				maxFeePerGas,
				maxPriorityFeePerGas,
				nonce,
				chainId,
				contractAddress,
				to
			)
		);
	};

	signBtcTransaction = async ({
		to,
		amount,
		fee,
		network,
		utxos
	}: {
		to: string;
		amount: bigint;
		fee: bigint;
		network: BtcNetwork;
		utxos: Utxo[];
	}): Promise<string> => {
		const { send_btc } = this.caller({ certified: true });

		return unwrap(await send_btc({ Sign: null }, to, amount, fee, network, utxos));
	};

	signSolMessage = async (message: Uint8Array): Promise<Uint8Array> => {
		const { sign_sol } = this.caller({ certified: true });

		const response = await sign_sol(message);

		if ('Ok' in response) {
			return Uint8Array.from(response.Ok);
		}

		throw new Error(response.Err);
	};
}

// The canister reports failures as a plain text variant, with no structured error
// type to map onto, so the text is surfaced as-is.
const unwrap = (response: Result): string => {
	if ('Ok' in response) {
		return response.Ok;
	}

	throw new Error(response.Err);
};
