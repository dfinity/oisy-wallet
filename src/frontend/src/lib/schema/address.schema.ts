import { parseBtcAddress } from '$btc/utils/btc-address.utils';
import type { BtcAddress, EthAddress, Icrcv2AccountId } from '$declarations/backend/backend.did';
import { parseIcpAccountId } from '$icp/utils/icp-account.utils';
import type { SolAddress } from '$lib/types/address';
import { isEthAddress } from '$lib/utils/account.utils';
import { isSolAddress } from '$sol/utils/sol-address.utils';
import { z } from 'zod';

const BaseAddressSchema = z.string().nonempty();

// eslint-disable-next-line local-rules/prefer-object-params
export const BtcAddressSchema = BaseAddressSchema.transform<BtcAddress>((data, context) => {
	const btcAddress = parseBtcAddress(data);

	if (btcAddress) {
		return btcAddress;
	}

	context.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'Could not parse Bitcoin address'
	});

	return z.NEVER;
}).transform<BtcAddress>((v) => v);

export const Icrcv2AccountIdSchema = BaseAddressSchema.transform<Icrcv2AccountId>(
	// eslint-disable-next-line local-rules/prefer-object-params
	(data, context): Icrcv2AccountId => {
		const accountId = parseIcpAccountId(data);

		if (accountId) {
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

export const EthAddressString = z.custom<string>(
	(val) => typeof val === 'string' && isEthAddress(val)
);
export const EthAddressSchema = EthAddressString.transform<EthAddress>((v) => ({ Public: v }));

export const SolAddressSchema = z
	.custom<string>((val) => typeof val === 'string' && isSolAddress(val))
	// Ensures that the type matches the backend type
	.transform<SolAddress>((v) => v);
