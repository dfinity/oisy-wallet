import type { OptionIdentity } from '$lib/types/identity';
import type { Option } from '$lib/types/utils';
import type { CanisterOptions } from '@dfinity/utils';
import { PrincipalTextSchema } from '@dfinity/zod-schemas';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import type * as z from 'zod';

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
