import type {
	BitcoinNetwork,
	EthSignTransactionRequest,
	SendBtcResponse,
	_SERVICE as SignerService
} from '$declarations/signer/signer.did';
import { idlFactory as idlCertifiedFactorySigner } from '$declarations/signer/signer.factory.certified.did';
import { idlFactory as idlFactorySigner } from '$declarations/signer/signer.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { PATRON } from '$lib/constants/app.constants';
import type { BtcAddress, EthAddress } from '$lib/types/address';
import type { SendBtcParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';
import {
	mapSignerCanisterBtcError,
	mapSignerCanisterGetEthAddressError,
	mapSignerCanisterSendBtcError
} from './signer.errors';

export class SignerCanister extends Canister<SignerService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<SignerService>): Promise<SignerCanister> {
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

		const response = await btc_caller_address({ network, address_type: { P2WPKH: null } }, [
			PATRON
		]);

		if ('Err' in response) {
			throw mapSignerCanisterBtcError(response.Err);
		}

		return response.Ok.address;
	};

	getBtcBalance = async ({ network }: { network: BitcoinNetwork }): Promise<bigint> => {
		const { btc_caller_balance } = this.caller({
			certified: true
		});

		const response = await btc_caller_balance({ network, address_type: { P2WPKH: null } }, [
			PATRON
		]);

		if ('Err' in response) {
			throw mapSignerCanisterBtcError(response.Err);
		}

		return response.Ok.balance;
	};

	getEthAddress = async (): Promise<EthAddress> => {
		const { eth_address } = this.caller({
			certified: true
		});

		/* Note: `eth_address` gets the Ethereum address of a given principal, defaulting to the caller if not provided. */
		/*       In OISY, we derive the ETH address from the caller. Therefore, we are not providing a principal as an argument. */
		const response = await eth_address({ principal: [] }, [PATRON]);

		if ('Err' in response) {
			throw mapSignerCanisterGetEthAddressError(response.Err);
		}

		const {
			Ok: { address }
		} = response;

		return address;
	};

	signTransaction = async ({
		transaction
	}: {
		transaction: EthSignTransactionRequest;
	}): Promise<string> => {
		const { eth_sign_transaction } = this.caller({
			certified: true
		});

		let response = await eth_sign_transaction(transaction, [PATRON]);

		// TODO: If the response does not match the type signature, so has neither `Ok` nor `Err`,
		//       will typescript have thrown an error before this point?  Ditto for the other APIs.
		//       It seems safer to check for `Ok` in response, and always throw an error if it's not there.

		if ('Ok' in response) {
			const {
				Ok: { signature }
			} = response;
			return signature;
		}

		throw mapSignerCanisterGetEthAddressError(response.Err);
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

	sendBtc = async ({
		addressType,
		feeSatoshis,
		utxosToSpend,
		...rest
	}: SendBtcParams): Promise<SendBtcResponse> => {
		const { btc_caller_send } = this.caller({
			certified: true
		});

		const response = await btc_caller_send(
			{
				address_type: addressType,
				utxos_to_spend: utxosToSpend,
				fee_satoshis: feeSatoshis,
				...rest
			},
			// TODO: Pass a payment type
			[]
		);

		if ('Err' in response) {
			throw mapSignerCanisterSendBtcError(response.Err);
		}

		return response.Ok;
	};
}
