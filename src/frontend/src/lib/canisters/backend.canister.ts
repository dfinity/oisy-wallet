import type {
	_SERVICE as BackendService,
	CustomToken,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { idlFactory as idlCertifiedFactoryBackend } from '$declarations/backend/backend.factory.certified.did';
import { idlFactory as idlFactoryBackend } from '$declarations/backend/backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import type {
	AddUserCredentialParams,
	AddUserCredentialResponse,
	GetUserProfileResponse
} from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices, toNullable, type QueryParams } from '@dfinity/utils';

export class BackendCanister extends Canister<BackendService> {
	static async create({ identity, ...options }: CreateCanisterOptions<BackendService>) {
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

	listUserTokens = async ({ certified }: QueryParams): Promise<UserToken[]> => {
		const { list_user_tokens } = this.caller({ certified });

		return list_user_tokens();
	};

	listCustomTokens = async ({ certified }: QueryParams): Promise<CustomToken[]> => {
		const { list_custom_tokens } = this.caller({ certified });

		return list_custom_tokens();
	};

	setManyCustomTokens = async ({ tokens }: { tokens: CustomToken[] }): Promise<void> => {
		const { set_many_custom_tokens } = this.caller({ certified: true });

		return set_many_custom_tokens(tokens);
	};

	setCustomToken = async ({ token }: { token: CustomToken }): Promise<void> => {
		const { set_custom_token } = this.caller({ certified: true });

		return set_custom_token(token);
	};

	setManyUserTokens = async ({ tokens }: { tokens: UserToken[] }): Promise<void> => {
		const { set_many_user_tokens } = this.caller({ certified: true });

		return set_many_user_tokens(tokens);
	};

	setUserToken = async ({ token }: { token: UserToken }): Promise<void> => {
		const { set_user_token } = this.caller({ certified: true });

		return set_user_token(token);
	};

	createUserProfile = async (): Promise<UserProfile> => {
		const { create_user_profile } = this.caller({ certified: true });

		return create_user_profile();
	};

	getUserProfile = async ({ certified }: QueryParams): Promise<GetUserProfileResponse> => {
		const { get_user_profile } = this.caller({ certified });

		return get_user_profile();
	};

	addUserCredential = async ({
		credentialJwt,
		issuerCanisterId,
		currentUserVersion,
		credentialSpec
	}: AddUserCredentialParams): Promise<AddUserCredentialResponse> => {
		const { add_user_credential } = this.caller({ certified: true });

		return add_user_credential({
			credential_jwt: credentialJwt,
			issuer_canister_id: issuerCanisterId,
			current_user_version: toNullable(currentUserVersion),
			credential_spec: credentialSpec
		});
	};
}
