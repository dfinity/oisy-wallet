import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { networkAddress } from '$lib/derived/network.derived';
import { ethAddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { encodeIcrcAccount } from '@dfinity/ledger-icrc';
import { get } from 'svelte/store';

describe('network.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		ethAddressStore.reset();
		mockPage.reset();
		authStore.setForTesting(mockIdentity);
		ethAddressStore.set(mockEthAddressWithCertified);
	});

	const mockEthAddressWithCertified = {
		data: mockEthAddress,
		certified: true
	};

	const expectedIcrcAddress = encodeIcrcAccount(getIcrcAccount(mockIdentity.getPrincipal()));

	test.each([
		{
			network: 'ICP',
			expectedAddress: expectedIcrcAddress
		},
		{
			network: 'ETH',
			expectedAddress: mockEthAddress
		}
	])('returns $network address when network is $network', ({ network, expectedAddress }) => {
		mockPage.mock({ network });

		const actualAddress = get(networkAddress);

		expect(actualAddress).toBe(expectedAddress);
	});
});
