import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import { PrincipalTextSchema } from '$lib/validation/principal.validation';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type { CanisterOptions } from '@dfinity/utils';
import { z } from 'zod';

export const CanisterIdTextSchema = PrincipalTextSchema;

export type CanisterIdText = z.infer<typeof CanisterIdTextSchema>;

export type OptionCanisterIdText = Option<CanisterIdText>;

export type CanisterApiFunctionParams<T = unknown> = T & {
	nullishIdentityErrorMessage?: string;
	identity: OptionIdentity;
	canisterId?: CanisterIdText;
};

export interface CreateCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId' | 'agent'> {
	canisterId: Principal;
	identity: Identity;
}
