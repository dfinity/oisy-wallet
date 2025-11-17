import type { Icrcv2AccountId } from '$declarations/backend/declarations/backend.did';
import { parseIcrcv2AccountId } from '$icp/utils/icp-account.utils';
import { nonNullish } from '@dfinity/utils';
import { z } from 'zod';

export const AddressSchema = z.string().nonempty();

export const Icrcv2AccountIdSchema = AddressSchema.refine((v) => !!parseIcrcv2AccountId(v));

export const Icrcv2AccountIdObjectSchema = Icrcv2AccountIdSchema.transform<Icrcv2AccountId>(
	// eslint-disable-next-line local-rules/prefer-object-params
	(data, context): Icrcv2AccountId => {
		const accountId = parseIcrcv2AccountId(data);

		if (nonNullish(accountId)) {
			return accountId;
		}

		context.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Could not parse Icrcv2 account address'
		});

		return z.NEVER;
	}
)
	// Ensures that the type matches the backend type
	.transform<Icrcv2AccountId>((v) => v);
