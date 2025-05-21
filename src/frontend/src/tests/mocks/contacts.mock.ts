import type { Contact, ContactAddressData } from '$declarations/backend/backend.did';
import { nonNullish } from '@dfinity/utils';

export const mockBackendAddressSol = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

export const mockBackendContactAddressSol: ContactAddressData = {
	token_account_id: { Sol: mockBackendAddressSol },
	label: ['Testwallet SOL']
};

export const mockBackendAddressBtc = '3AdD7ZaJQw9m1maN39CeJ1zVyXQLn2MEHR';

export const mockBackendContactAddressBtc: ContactAddressData = {
	token_account_id: { Btc: { P2SH: mockBackendAddressBtc } },
	label: ['Testwallet BTC']
};

export const mockBackendAddressEth = '0x1D1479C185d32EB90533a08b36B3CFa5F84A0E6B';

export const mockBackendContactAddressEth: ContactAddressData = {
	token_account_id: { Eth: { Public: mockBackendAddressEth } },
	label: ['Testwallet Eth']
};

export const getMockContacts = ({
	n,
	name,
	addresses
}: {
	n: number;
	name?: string;
	addresses?: ContactAddressData[];
}): Contact[] =>
	Array(n)
		.fill(null)
		.map(
			(_, i) =>
				({
					id: BigInt(i),
					name: name ?? 'Testname',
					update_timestamp_ns: 12,
					addresses: nonNullish(addresses) ? addresses : []
				}) as unknown as Contact
		);
