import { isKaspaAddress, parseKaspaAddress } from '$kaspa/utils/kaspa-address.utils';
import { AddressSchema } from '$lib/schema/address.schema';
import { nonNullish } from '@dfinity/utils';
import { z } from 'zod';

export const KaspaAddressSchema = AddressSchema.refine((val) => isKaspaAddress({ address: val }));

export const KaspaAddressStringSchema = KaspaAddressSchema.transform<string>((data, context) => {
	const kaspaAddress = parseKaspaAddress(data);

	if (nonNullish(kaspaAddress)) {
		return kaspaAddress;
	}

	context.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'Could not parse Kaspa address'
	});

	return z.NEVER;
});
