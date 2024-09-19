import type {
	BitcoinNetwork,
	_SERVICE as SignerService,
	SignRequest
} from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import { Principal } from '@dfinity/principal';
import { Canister, createServices, type CanisterOptions } from '@dfinity/utils';

interface SignerCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
	canisterId: Principal;
}

type SignerCanisterFunctionParams<T = Record<string, never>> = T & {
	certified?: boolean;
};

export class SignerCanister extends Canister<SignerService> {
	static create(options: SignerCanisterOptions<SignerService>) {
		const { service, certifiedService, canisterId } = createServices<SignerService>({
			options,
			idlFactory: idlFactorySigner,
			certifiedIdlFactory: idlCertifiedFactorySigner
		});

		return new SignerCanister(canisterId, service, certifiedService);
	}

	getBtcAddress = ({
		network,
		certified = true
	}: SignerCanisterFunctionParams<{
		network: BitcoinNetwork;
	}>): Promise<BtcAddress> => {
		const { caller_btc_address } = this.caller({
			certified
		});

		return caller_btc_address(network);
	};

	updateBtcBalance = ({
		network,
		certified = true
	}: SignerCanisterFunctionParams<{
		network: BitcoinNetwork;
	}>): Promise<bigint> => {
		const { caller_btc_balance } = this.caller({
			certified
		});

		return caller_btc_balance(network);
	};

	getEthAddress = ({ certified = true }: SignerCanisterFunctionParams): Promise<EthAddress> => {
		const { caller_eth_address } = this.caller({
			certified
		});

		return caller_eth_address();
	};

	signTransaction = ({
		transaction,
		certified = true
	}: SignerCanisterFunctionParams<{
		transaction: SignRequest;
	}>): Promise<string> => {
		const { sign_transaction } = this.caller({
			certified
		});

		return sign_transaction(transaction);
	};

	personalSign = ({
		message,
		certified = true
	}: SignerCanisterFunctionParams<{
		message: string;
	}>): Promise<string> => {
		const { personal_sign } = this.caller({
			certified
		});

		return personal_sign(message);
	};

	signPrehash = ({
		hash,
		certified = true
	}: SignerCanisterFunctionParams<{
		hash: string;
	}>): Promise<string> => {
		const { sign_prehash } = this.caller({
			certified
		});

		return sign_prehash(hash);
	};
}
