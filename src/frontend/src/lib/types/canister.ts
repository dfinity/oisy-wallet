import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import type { CanisterOptions } from '@dfinity/utils';
import { PrincipalTextSchema } from '@dfinity/zod-schemas';
import type * as z from 'zod/v4';

export const CanisterIdTextSchema = PrincipalTextSchema;

export type CanisterIdText = z.infer<typeof CanisterIdTextSchema>;

export type OptionCanisterIdText = Option<CanisterIdText>;

export type CanisterApiFunctionParams<T = unknown> = T & {
	nullishIdentityErrorMessage?: string;
	identity: OptionIdentity;
	canisterId?: CanisterIdText;
	tokenLedgerCanisterId?: string;
};

export interface CreateCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId' | 'agent'> {
	canisterId: Principal;
	identity: Identity;
}

export type CanisterApiFunctionParamsWithCanisterId<T = unknown> = Omit<
	CanisterApiFunctionParams<T>,
	'canisterId'
> & {
	canisterId: CanisterIdText;
};
