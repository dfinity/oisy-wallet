import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type { CanisterOptions } from '@dfinity/utils';

export type CanisterIdText = string;

export type OptionCanisterIdText = Option<CanisterIdText>;

export type CommonCanisterApiFunctionParams<T = unknown> = T & {
	nullishIdentityErrorMessage?: string;
	identity: OptionIdentity;
	canisterId?: CanisterIdText;
};

export interface CreateCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId' | 'agent'> {
	canisterId: Principal;
	identity: Identity;
}
