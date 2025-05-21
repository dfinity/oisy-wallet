import type { Contact, ContactAddressData } from '$declarations/backend/backend.did';
import { mockBtcP2SHAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { nonNullish } from '@dfinity/utils';

export const mockBackendContactAddressSol: ContactAddressData = {
	token_account_id: { Sol: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' },
	label: ['Testwallet SOL']
};

export const mockBackendContactAddressBtc: ContactAddressData = {
	token_account_id: { Btc: { P2SH: mockBtcP2SHAddress } },
	label: ['Testwallet BTC']
};

export const mockBackendContactAddressEth: ContactAddressData = {
	token_account_id: { Eth: { Public: mockEthAddress } },
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
