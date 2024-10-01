import type {
	BitcoinNetwork,
	_SERVICE as SignerService,
	SignRequest
} from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';
import { signerCanisterError } from './signer.errors';

export class SignerCanister extends Canister<SignerService> {
	static async create({ identity, ...options }: CreateCanisterOptions<SignerService>) {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<SignerService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactorySigner,
			certifiedIdlFactory: idlCertifiedFactorySigner
		});

		return new SignerCanister(canisterId, service, certifiedService);
	}

	getBtcAddress = async ({ network }: { network: BitcoinNetwork }): Promise<BtcAddress> => {
		const { btc_caller_address } = this.caller({
			certified: true
		});

		const response = await btc_caller_address({ network, address_type: { P2WPKH: null } }, []);

		if ('Err' in response) {
			throw signerCanisterError(response.Err);
		}

		return response.Ok.address;
	};

	getBtcBalance = async ({ network }: { network: BitcoinNetwork }): Promise<bigint> => {
		const { btc_caller_balance } = this.caller({
			certified: true
		});

		const response = await btc_caller_balance({ network, address_type: { P2WPKH: null } }, []);

		if ('Err' in response) {
			throw signerCanisterError(response.Err);
		}

		return response.Ok.balance;
	};

	getEthAddress = (): Promise<EthAddress> => {
		const { caller_eth_address } = this.caller({
			certified: true
		});

		return caller_eth_address();
	};

	signTransaction = ({ transaction }: { transaction: SignRequest }): Promise<string> => {
		const { sign_transaction } = this.caller({
			certified: true
		});

		return sign_transaction(transaction);
	};

	personalSign = ({ message }: { message: string }): Promise<string> => {
		const { personal_sign } = this.caller({
			certified: true
		});

		return personal_sign(message);
	};

	signPrehash = ({ hash }: { hash: string }): Promise<string> => {
		const { sign_prehash } = this.caller({
			certified: true
		});

		return sign_prehash(hash);
	};
}
