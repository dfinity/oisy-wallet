import type { BitcoinNetwork, _SERVICE as SignerService } from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { SIGNER_CANISTER_ID } from '$lib/constants/app.constants';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Canister, createServices, type CanisterOptions } from '@dfinity/utils';

export interface SignerCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
	canisterId: Principal;
}

class SignerCanister extends Canister<SignerService> {
	static create(options: SignerCanisterOptions<SignerService>) {
		const { service, certifiedService, canisterId } = createServices<SignerService>({
			options,
			idlFactory: idlFactorySigner,
			certifiedIdlFactory: idlCertifiedFactorySigner
		});

		return new SignerCanister(canisterId, service, certifiedService);
	}

	getBtcBalance = ({ network }: { network: BitcoinNetwork }): Promise<bigint> => {
		const { caller_btc_balance } = this.caller({
			certified: true
		});

		return caller_btc_balance(network);
	};
}

export const signerCanister = async ({
	identity
}: {
	identity: Identity;
}): Promise<SignerCanister> => {
	const agent = await getAgent({ identity });

	return SignerCanister.create({
		agent,
		canisterId: Principal.fromText(SIGNER_CANISTER_ID)
	});
};
