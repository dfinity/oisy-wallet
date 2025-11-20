import type {
	_SERVICE as ExtV2TokenService,
	Transaction
} from '$declarations/ext_v2_token/declarations/ext_v2_token.did';
import { idlFactory as idlCertifiedFactoryXtcLedger } from '$declarations/xtc_ledger/xtc_ledger.factory.certified.did';
import { idlFactory as idlFactoryXtcLedger } from '$declarations/xtc_ledger/xtc_ledger.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, type QueryParams } from '@dfinity/utils';

export class ExtV2TokenCanister extends Canister<ExtV2TokenService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<ExtV2TokenService>): Promise<ExtV2TokenCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<ExtV2TokenService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryXtcLedger,
			certifiedIdlFactory: idlCertifiedFactoryXtcLedger
		});

		return new ExtV2TokenCanister(canisterId, service, certifiedService);
	}

	transactions = async ({ certified }: QueryParams): Promise<Transaction[]> => {
		const { transactions } = this.caller({ certified });

		return await transactions();
	};
}
