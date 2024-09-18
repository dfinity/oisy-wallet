import type { BitcoinNetwork, _SERVICE as SignerService } from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import { Principal } from '@dfinity/principal';
import { Canister, createServices, type CanisterOptions } from '@dfinity/utils';

interface SignerCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
	canisterId: Principal;
}

export class SignerCanister extends Canister<SignerService> {
	static create(options: SignerCanisterOptions<SignerService>) {
		const { service, certifiedService, canisterId } = createServices<SignerService>({
			options,
			idlFactory: idlFactorySigner,
			certifiedIdlFactory: idlCertifiedFactorySigner
		});

		return new SignerCanister(canisterId, service, certifiedService);
	}

	updateBtcBalance = ({ network }: { network: BitcoinNetwork }): Promise<bigint> => {
		const { caller_btc_balance } = this.caller({
			certified: true
		});

		return caller_btc_balance(network);
	};
}
