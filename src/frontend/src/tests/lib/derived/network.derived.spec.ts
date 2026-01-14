import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
import {
	selectedNetworkNftSupported,
	selectedNetworkNftUnsupported
} from '$lib/derived/network.derived';
import { ethAddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
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

	describe('selectedNetworkNftSupported', () => {
		const networksThatUSupportNfts = SUPPORTED_NETWORKS.filter(({ supportsNft }) => supportsNft);
		const networksThatDoNotSupportNfts = SUPPORTED_NETWORKS.filter(
			({ supportsNft }) => !supportsNft
		);

		beforeEach(() => {
			mockPage.reset();

			setupUserNetworksStore('allEnabled');
			setupTestnetsStore('enabled');
		});

		it('should return true when no network is selected', () => {
			mockPage.mock({ network: undefined });

			expect(get(selectedNetworkNftSupported)).toBeTruthy();
		});

		it.each(networksThatUSupportNfts)(
			'should return true for $id network that supports NFTs',
			(network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedNetworkNftSupported)).toBeTruthy();
			}
		);

		it.each(networksThatDoNotSupportNfts)(
			'should return false for $id network that does not support NFTs',
			(network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedNetworkNftSupported)).toBeFalsy();
			}
		);
	});

	describe('selectedNetworkNftUnsupported', () => {
		const networksThatUSupportNfts = SUPPORTED_NETWORKS.filter(({ supportsNft }) => supportsNft);
		const networksThatDoNotSupportNfts = SUPPORTED_NETWORKS.filter(
			({ supportsNft }) => !supportsNft
		);

		beforeEach(() => {
			mockPage.reset();

			setupUserNetworksStore('allEnabled');
			setupTestnetsStore('enabled');
		});

		it('should return false when no network is selected', () => {
			mockPage.mock({ network: undefined });

			expect(get(selectedNetworkNftUnsupported)).toBeFalsy();
		});

		it.each(networksThatUSupportNfts)(
			'should return false for $id network that supports NFTs',
			(network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedNetworkNftUnsupported)).toBeFalsy();
			}
		);

		it.each(networksThatDoNotSupportNfts)(
			'should return true for $id network that does not support NFTs',
			(network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedNetworkNftUnsupported)).toBeTruthy();
			}
		);
	});
});
