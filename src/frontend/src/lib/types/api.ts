import type {
	AddUserCredentialError,
	CredentialSpec,
	GetUserProfileError,
	UserProfile
} from '$declarations/backend/backend.did';
import { Principal } from '@dfinity/principal';

export interface AddUserCredentialParams {
	credentialJwt: string;
	issuerCanisterId: Principal;
	currentUserVersion?: bigint;
	credentialSpec: CredentialSpec;
}
export type AddUserCredentialResponse = { Ok: null } | { Err: AddUserCredentialError };

export type GetUserProfileResponse = { Ok: UserProfile } | { Err: GetUserProfileError };
