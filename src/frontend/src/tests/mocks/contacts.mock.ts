import type { Contact, ContactAddressData } from '$declarations/backend/backend.did';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import { mockBtcP2SHAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { nonNullish } from '@dfinity/utils';
import { mockBtcAddress } from './btc.mock';
import { mockEthAddress } from './eth.mock';
import { mockAccountIdentifierText } from './identity.mock';

export const mockBackendContactAddressSol: ContactAddressData = {
	token_account_id: { Sol: mockSolAddress },
	label: ['Testwallet SOL']
};

export const mockBackendContactAddressBtc: ContactAddressData = {
	token_account_id: { Btc: { P2SH: mockBtcP2SHAddress } },
	label: ['Testwallet BTC']
};

export const mockBackendContactAddressEth: ContactAddressData = {
	token_account_id: { Eth: { Public: mockEthAddress3 } },
	label: ['Testwallet Eth']
};

export const getMockContacts = ({
	n,
	names,
	addresses
}: {
	n: number;
	names?: string[];
	addresses?: ContactAddressData[][];
}): Contact[] =>
	Array(n)
		.fill(null)
		.map(
			(_, i) =>
				({
					id: BigInt(i),
					name: names?.[i] ?? 'Testname',
					update_timestamp_ns: 12,
					addresses: nonNullish(addresses?.[i]) ? addresses[i] : [],
					image: []
				}) as unknown as Contact
		);

export const mockContactIcrcAddressUi: ContactAddressUi = {
	addressType: 'Icrcv2',
	address: mockAccountIdentifierText
};

export const mockContactBtcAddressUi: ContactAddressUi = {
	addressType: 'Btc',
	address: mockBtcAddress,
	label: 'My Bitcoin Address'
};

export const mockContactEthAddressUi: ContactAddressUi = {
	addressType: 'Eth',
	address: mockEthAddress
};

export const mockContactUiSolAddressUi: ContactAddressUi = {
	addressType: 'Sol',
	address: mockSolAddress
};

export const getMockContactsUi = ({
	n,
	name,
	addresses = []
}: {
	n: number;
	name?: string;
	addresses: ContactAddressUi[];
}): ContactUi[] =>
	Array.from({ length: n }, (_, i) => ({
		id: BigInt(i),
		name: name ?? 'Testname',
		updateTimestampNs: BigInt(12),
		addresses,
		image: undefined
	}));
