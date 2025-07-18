import { parseBtcAddress } from '$btc/utils/btc-address.utils';
import type { BtcAddress, Icrcv2AccountId } from '$declarations/backend/backend.did';
import { parseIcrcv2AccountId } from '$icp/utils/icp-account.utils';
import { isEthAddress } from '$lib/utils/account.utils';
import { isBtcAddress } from '$lib/utils/address.utils';
import { isSolAddress } from '$sol/utils/sol-address.utils';
import { nonNullish } from '@dfinity/utils';
import { z } from 'zod/v4';

export const AddressSchema = z.string().nonempty();

export const SolAddressSchema = AddressSchema.refine((val) => isSolAddress(val));

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

export const EthAddressSchema = AddressSchema.refine((val) => isEthAddress(val));

export const EthAddressObjectSchema = EthAddressSchema.transform((v) => ({ Public: v }));

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
