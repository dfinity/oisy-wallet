import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import {
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK
} from '$env/networks/networks.sol.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { networkAddress, networkAddressStore } from '$lib/derived/network-address.derived';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	xrpAddressMainnetStore
} from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIcrcAccount, mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress, mockSolAddress2, mockSolAddress3 } from '$tests/mocks/sol.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { get } from 'svelte/store';

// XRP is force-disabled under TEST, so it is absent from the supported-network
// catalog that `networkId` resolves against. Enable it for this spec so the XRP
// store-selection branch can be exercised.
vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		XRP_MAINNET_ENABLED: true,
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

describe('network-address.derived', () => {
	const mockEthAddressWithCertified = {
		data: mockEthAddress,
		certified: true
	};

	const mockBtcMainnetAddressWithCertified = {
		data: mockBtcAddress,
		certified: true
	};
	const mockBtcTestnetAddressWithCertified = {
		data: mockBtcAddress,
		certified: true
	};
	const mockBtcRegtestAddressWithCertified = {
		data: mockBtcAddress,
		certified: true
	};

	const mockSolMainnetAddressWithCertified = {
		data: mockSolAddress,
		certified: true
	};
	const mockSolDevnetAddressWithCertified = {
		data: mockSolAddress2,
		certified: true
	};
	const mockSolLocalnetAddressWithCertified = {
		data: mockSolAddress3,
		certified: true
	};

	const mockXrpMainnetAddressWithCertified = {
		data: mockXrpAddress,
		certified: true
	};

	const expectedIcrcAddress = encodeIcrcAccount(mockIcrcAccount);

	beforeEach(() => {
		vi.clearAllMocks();

		ethAddressStore.reset();
		ethAddressStore.set(mockEthAddressWithCertified);

		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();
		btcAddressMainnetStore.set(mockBtcMainnetAddressWithCertified);
		btcAddressTestnetStore.set(mockBtcTestnetAddressWithCertified);
		btcAddressRegtestStore.set(mockBtcRegtestAddressWithCertified);

		solAddressMainnetStore.reset();
		solAddressDevnetStore.reset();
		solAddressLocalnetStore.reset();
		solAddressMainnetStore.set(mockSolMainnetAddressWithCertified);
		solAddressDevnetStore.set(mockSolDevnetAddressWithCertified);
		solAddressLocalnetStore.set(mockSolLocalnetAddressWithCertified);

		xrpAddressMainnetStore.reset();
		xrpAddressMainnetStore.set(mockXrpMainnetAddressWithCertified);

		mockPage.reset();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		authStore.setForTesting(mockIdentity);
	});

	describe('networkAddressStore', () => {
		test.each([
			{
				network: BTC_MAINNET_NETWORK,
				expectedStore: mockBtcMainnetAddressWithCertified
			},
			{
				network: BTC_TESTNET_NETWORK,
				expectedStore: mockBtcTestnetAddressWithCertified
			},
			{
				network: BTC_REGTEST_NETWORK,
				expectedStore: mockBtcRegtestAddressWithCertified
			},
			{
				network: ETHEREUM_NETWORK,
				expectedStore: mockEthAddressWithCertified
			},
			{
				network: SEPOLIA_NETWORK,
				expectedStore: mockEthAddressWithCertified
			},
			{
				network: BASE_NETWORK,
				expectedStore: mockEthAddressWithCertified
			},
			{
				network: POLYGON_AMOY_NETWORK,
				expectedStore: mockEthAddressWithCertified
			},
			{
				network: SOLANA_MAINNET_NETWORK,
				expectedStore: mockSolMainnetAddressWithCertified
			},
			{
				network: SOLANA_DEVNET_NETWORK,
				expectedStore: mockSolDevnetAddressWithCertified
			},
			{
				network: SOLANA_LOCAL_NETWORK,
				expectedStore: mockSolLocalnetAddressWithCertified
			},
			{
				network: XRP_MAINNET_NETWORK,
				expectedStore: mockXrpMainnetAddressWithCertified
			}
		])(
			'should return $network.id.description address store when network is $network.name',
			({ network: { id: networkId }, expectedStore }) => {
				mockPage.mockNetwork(networkId.description);

				const actualAddress = get(networkAddressStore);

				expect(actualAddress).toBe(expectedStore);
			}
		);
	});

	describe('networkAddress', () => {
		test.each([
			{
				network: 'ICP',
				expectedAddress: expectedIcrcAddress
			},
			{
				network: 'ETH',
				expectedAddress: mockEthAddress
			}
		])(
			'should return $network address when network is $network',
			({ network, expectedAddress }) => {
				mockPage.mockNetwork(network);

				const actualAddress = get(networkAddress);

				expect(actualAddress).toBe(expectedAddress);
			}
		);
	});
});
