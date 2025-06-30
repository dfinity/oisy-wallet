import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import type {
	_SERVICE as BitcoinService,
	get_utxos_response,
	network
} from '@dfinity/ckbtc/dist/candid/bitcoin.d.ts';
import { idlFactory as bitcoinIdlFactory } from '@dfinity/ckbtc/dist/candid/bitcoin.idl.js';
import { Canister, createServices } from '@dfinity/utils';

// Fixed mapping that includes regtest
const mapBitcoinNetwork: Record<BitcoinNetwork, network> = {
	mainnet: { mainnet: null },
	testnet: { testnet: null },
	regtest: { regtest: null }
};

export class BitcoinDirectCanister extends Canister<BitcoinService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<BitcoinService>): Promise<BitcoinDirectCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<BitcoinService>({
			options: {
				...options,
				agent
			},
			idlFactory: bitcoinIdlFactory,
			certifiedIdlFactory: bitcoinIdlFactory // Bitcoin canister doesn't have separate certified factory
		});

		return new BitcoinDirectCanister(canisterId, service, certifiedService);
	}

	getUtxosQuery = ({
		address,
		network,
		filter
	}: {
		address: string;
		network: BitcoinNetwork;
		filter?: { minConfirmations: number } | { page: Uint8Array | number[] };
	}): Promise<get_utxos_response> => {
		const { bitcoin_get_utxos_query } = this.caller({
			certified: false
		});

		const filterParam: [] | [{ page: Uint8Array | number[] } | { min_confirmations: number }] =
			filter
				? [
						'minConfirmations' in filter
							? { min_confirmations: filter.minConfirmations }
							: { page: filter.page }
					]
				: [];

		return bitcoin_get_utxos_query({
			address,
			network: mapBitcoinNetwork[network],
			filter: filterParam
		});
	};
}
