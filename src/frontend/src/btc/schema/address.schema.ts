import { isBtcAddress, parseBtcAddress } from '$btc/utils/btc-address.utils';
import type { BtcAddress } from '$declarations/backend/backend.did';
import { AddressSchema } from '$lib/schema/address.schema';
import { nonNullish } from '@dfinity/utils';
import { z } from 'zod';

export const BtcAddressSchema = AddressSchema.refine((val) => isBtcAddress({ address: val }));

// eslint-disable-next-line local-rules/prefer-object-params
export const BtcAddressObjectSchema = BtcAddressSchema.transform<BtcAddress>((data, context) => {
	const btcAddress = parseBtcAddress(data);

	if (nonNullish(btcAddress)) {
		return btcAddress;
	}

	context.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'Could not parse Bitcoin address'
	});

	return z.NEVER;
}).transform<BtcAddress>((v) => v);
