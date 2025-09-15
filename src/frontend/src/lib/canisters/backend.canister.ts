import type {
	AddUserCredentialResult,
	AllowSigningResponse,
	_SERVICE as BackendService,
	BtcGetFeePercentilesResponse,
	Contact,
	CreateChallengeResponse,
	CustomToken,
	GetAllowedCyclesResponse,
	PendingTransaction,
	SelectedUtxosFeeResponse,
	UserProfile,
	UserToken,
	UserTokenId
} from '$declarations/backend/backend.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import {
	mapAllowSigningError,
	mapBtcPendingTransactionError,
	mapBtcSelectUserUtxosFeeError,
	mapCreateChallengeError,
	mapGetAllowedCyclesError
} from '$lib/canisters/backend.errors';
import type {
	AddUserCredentialParams,
	AddUserHiddenDappIdParams,
	AllowSigningParams,
	BtcAddPendingTransactionParams,
	BtcGetFeePercentilesParams,
	BtcGetPendingTransactionParams,
	BtcSelectUserUtxosFeeParams,
	GetUserProfileResponse,
	SaveUserAgreements,
	SaveUserNetworksSettings,
	SetUserShowTestnetsParams,
	UpdateUserExperimentalFeatureSettings
} from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mapBackendUserAgreements } from '$lib/utils/agreements.utils';
import { mapUserExperimentalFeatures } from '$lib/utils/user-experimental-features.utils';
import { mapUserNetworks } from '$lib/utils/user-networks.utils';
import { Canister, createServices, toNullable, type QueryParams } from '@dfinity/utils';

export class BackendCanister extends Canister<BackendService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<BackendService>): Promise<BackendCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<BackendService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryBackend,
			certifiedIdlFactory: idlCertifiedFactoryBackend
		});

		return new BackendCanister(canisterId, service, certifiedService);
	}

	listUserTokens = ({ certified = true }: QueryParams): Promise<UserToken[]> => {
		const { list_user_tokens } = this.caller({ certified });

		return list_user_tokens();
	};

	listCustomTokens = ({ certified = true }: QueryParams): Promise<CustomToken[]> => {
		const { list_custom_tokens } = this.caller({ certified });

		return list_custom_tokens();
	};

	setManyCustomTokens = ({ tokens }: { tokens: CustomToken[] }): Promise<void> => {
		const { set_many_custom_tokens } = this.caller({ certified: true });

		return set_many_custom_tokens(tokens);
	};

	setCustomToken = ({ token }: { token: CustomToken }): Promise<void> => {
		const { set_custom_token } = this.caller({ certified: true });

		return set_custom_token(token);
	};

	setManyUserTokens = ({ tokens }: { tokens: UserToken[] }): Promise<void> => {
		const { set_many_user_tokens } = this.caller({ certified: true });

		return set_many_user_tokens(tokens);
	};

	setUserToken = ({ token }: { token: UserToken }): Promise<void> => {
		const { set_user_token } = this.caller({ certified: true });

		return set_user_token(token);
	};

	removeUserToken = (params: UserTokenId): Promise<void> => {
		const { remove_user_token } = this.caller({ certified: true });

		return remove_user_token(params);
	};

	removeCustomToken = ({ token }: { token: CustomToken }): Promise<void> => {
		const { remove_custom_token } = this.caller({ certified: true });

		return remove_custom_token(token);
	};

	createUserProfile = (): Promise<UserProfile> => {
		const { create_user_profile } = this.caller({ certified: true });

		return create_user_profile();
	};

	getUserProfile = ({ certified = true }: QueryParams): Promise<GetUserProfileResponse> => {
		const { get_user_profile } = this.caller({ certified });

		return get_user_profile();
	};

	addUserCredential = ({
		credentialJwt,
		issuerCanisterId,
		currentUserVersion,
		credentialSpec
	}: AddUserCredentialParams): Promise<AddUserCredentialResult> => {
		const { add_user_credential } = this.caller({ certified: true });

		return add_user_credential({
			credential_jwt: credentialJwt,
			issuer_canister_id: issuerCanisterId,
			current_user_version: toNullable(currentUserVersion),
			credential_spec: credentialSpec
		});
	};

	btcAddPendingTransaction = async ({
		txId,
		...rest
	}: BtcAddPendingTransactionParams): Promise<boolean> => {
		const { btc_add_pending_transaction } = this.caller({ certified: true });

		const response = await btc_add_pending_transaction({
			txid: txId,
			...rest
		});

		if ('Ok' in response) {
			return true;
		}

		throw mapBtcPendingTransactionError(response.Err);
	};

	// TODO: rename to plural
	btcGetPendingTransaction = async ({
		network,
		address
	}: BtcGetPendingTransactionParams): Promise<PendingTransaction[]> => {
		const { btc_get_pending_transactions } = this.caller({ certified: true });

		const response = await btc_get_pending_transactions({
			network,
			address
		});

		if ('Ok' in response) {
			const {
				Ok: { transactions }
			} = response;
			return transactions;
		}

		throw mapBtcPendingTransactionError(response.Err);
	};

	btcSelectUserUtxosFee = async ({
		network,
		minConfirmations,
		amountSatoshis
	}: BtcSelectUserUtxosFeeParams): Promise<SelectedUtxosFeeResponse> => {
		const { btc_select_user_utxos_fee } = this.caller({ certified: true });

		const response = await btc_select_user_utxos_fee({
			network,
			min_confirmations: minConfirmations,
			amount_satoshis: amountSatoshis
		});

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapBtcSelectUserUtxosFeeError(response.Err);
	};

	btcGetCurrentFeePercentiles = async ({
		network
	}: BtcGetFeePercentilesParams): Promise<BtcGetFeePercentilesResponse> => {
		const { btc_get_current_fee_percentiles } = this.caller({ certified: true });

		const response = await btc_get_current_fee_percentiles({
			network
		});

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		// Reuse the same error mapping as other BTC methods since they share the same error type
		throw mapBtcSelectUserUtxosFeeError(response.Err);
	};

	getAllowedCycles = async (): Promise<GetAllowedCyclesResponse> => {
		const { get_allowed_cycles } = this.caller({ certified: true });

		const response = await get_allowed_cycles();

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapGetAllowedCyclesError(response.Err);
	};

	allowSigning = async ({ request }: AllowSigningParams = {}): Promise<AllowSigningResponse> => {
		const { allow_signing } = this.caller({ certified: true });

		const response = await allow_signing(toNullable(request));

		if ('Ok' in response) {
			const { Ok } = response;
			return Ok;
		}

		throw mapAllowSigningError(response.Err);
	};

	createPowChallenge = async (): Promise<CreateChallengeResponse> => {
		const { create_pow_challenge } = this.caller({ certified: true });

		const result = await create_pow_challenge();
		if ('Ok' in result) {
			const { Ok } = result;
			return Ok;
		}

		throw mapCreateChallengeError(result.Err);
	};

	addUserHiddenDappId = async ({
		dappId,
		currentUserVersion
	}: AddUserHiddenDappIdParams): Promise<void> => {
		const { add_user_hidden_dapp_id } = this.caller({ certified: true });

		await add_user_hidden_dapp_id({
			dapp_id: dappId,
			current_user_version: toNullable(currentUserVersion)
		});
	};

	setUserShowTestnets = async ({
		showTestnets,
		currentUserVersion
	}: SetUserShowTestnetsParams): Promise<void> => {
		const { set_user_show_testnets } = this.caller({ certified: true });

		await set_user_show_testnets({
			show_testnets: showTestnets,
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateUserNetworkSettings = async ({
		networks,
		currentUserVersion
	}: SaveUserNetworksSettings): Promise<void> => {
		const { update_user_network_settings } = this.caller({ certified: true });

		await update_user_network_settings({
			networks: mapUserNetworks(networks),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	updateUserAgreements = async ({
		agreements,
		currentUserVersion
	}: SaveUserAgreements): Promise<void> => {
		const { update_user_agreements } = this.caller({ certified: true });

		await update_user_agreements({
			agreements: mapBackendUserAgreements(agreements),
			current_user_version: toNullable(currentUserVersion)
		});
	};

	getContact = async (id: bigint): Promise<Contact> => {
		const { get_contact } = this.caller({ certified: false });
		const response = await get_contact(id);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	getContacts = async (): Promise<Contact[]> => {
		const { get_contacts } = this.caller({ certified: false });
		const response = await get_contacts();

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	createContact = async (name: string): Promise<Contact> => {
		const { create_contact } = this.caller({ certified: true });
		const response = await create_contact({ name, image: [] });

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	deleteContact = async (id: bigint): Promise<bigint> => {
		const { delete_contact } = this.caller({ certified: true });
		const response = await delete_contact(id);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	updateContact = async (contact: Contact): Promise<Contact> => {
		const { update_contact } = this.caller({ certified: true });
		const response = await update_contact(contact);

		if ('Ok' in response) {
			return response.Ok;
		}
		throw response.Err;
	};

	updateUserExperimentalFeatureSettings = async ({
		experimentalFeatures,
		currentUserVersion
	}: UpdateUserExperimentalFeatureSettings): Promise<void> => {
		const { update_user_experimental_feature_settings } = this.caller({ certified: true });

		await update_user_experimental_feature_settings({
			experimental_features: mapUserExperimentalFeatures(experimentalFeatures),
			current_user_version: toNullable(currentUserVersion)
		});
	};
}
