import { isKaspaAddress, parseKaspaAddress } from '$kaspa/utils/kaspa-address.utils';
import { AddressSchema } from '$lib/schema/address.schema';
import { nonNullish } from '@dfinity/utils';
import { z } from 'zod';

export const KaspaAddressSchema = AddressSchema.refine((val) => isKaspaAddress({ address: val }));

// Schema that transforms to Candid KaspaAddress variant: { Public: address }
export const KaspaAddressObjectSchema = KaspaAddressSchema.transform<{ Public: string }>(
	(data, context) => {
		const kaspaAddress = parseKaspaAddress(data);

		if (nonNullish(kaspaAddress)) {
			return { Public: kaspaAddress };
		}

		context.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Could not parse Kaspa address'
		});

		return z.NEVER;
	}
);
