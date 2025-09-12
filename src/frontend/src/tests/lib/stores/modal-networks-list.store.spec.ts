import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { initModalNetworksListContext } from '$lib/stores/modal-networks-list.store';
import { get } from 'svelte/store';

describe('modalNetworksListStore', () => {
	const mockNetworks = [
		ICP_NETWORK,
		ETHEREUM_NETWORK,
		SEPOLIA_NETWORK,
		BASE_NETWORK,
		BSC_MAINNET_NETWORK
	];

	it('should have all expected values with initial data', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [ICP_NETWORK.id, ETHEREUM_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK, ETHEREUM_NETWORK]);
	});

	it('should have all expected values with initial data where allowedNetworkIds are not provided', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: mockNetworks
		});

		expect(get(filteredNetworks)).toEqual(mockNetworks);
	});

	it('should return all networks when allowedNetworkIds is empty array', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: []
		});

		expect(get(filteredNetworks)).toEqual(mockNetworks);
	});

	it('should filter networks by allowedNetworkIds', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [SEPOLIA_NETWORK.id, BASE_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([SEPOLIA_NETWORK, BASE_NETWORK]);
	});

	it('should filter networks with single allowedNetworkId', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);
	});

	it('should update networks using setNetworks', () => {
		const { filteredNetworks, setNetworks } = initModalNetworksListContext({
			networks: [ICP_NETWORK],
			allowedNetworkIds: [ICP_NETWORK.id, ETHEREUM_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		setNetworks([ICP_NETWORK, ETHEREUM_NETWORK]);

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK, ETHEREUM_NETWORK]);
	});

	it('should update allowedNetworkIds using setAllowedNetworkIds', () => {
		const { filteredNetworks, setAllowedNetworkIds } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		setAllowedNetworkIds([ETHEREUM_NETWORK.id, BASE_NETWORK.id]);

		expect(get(filteredNetworks)).toEqual([ETHEREUM_NETWORK, BASE_NETWORK]);
	});

	it('should reset filter when calledresetAllowedNetworksIds', () => {
		const { filteredNetworks, resetAllowedNetworkIds } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		resetAllowedNetworkIds();

		expect(get(filteredNetworks)).toEqual(mockNetworks);
	});

	it('should clear filter when setAllowedNetworkIds is called with empty array', () => {
		const { filteredNetworks, setAllowedNetworkIds } = initModalNetworksListContext({
			networks: mockNetworks,
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		setAllowedNetworkIds([]);

		expect(get(filteredNetworks)).toEqual(mockNetworks);
	});

	it('should handle empty networks array', () => {
		const { filteredNetworks } = initModalNetworksListContext({
			networks: [],
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([]);
	});

	it('should update when both networks and allowedNetworkIds are changed', () => {
		const { filteredNetworks, setNetworks, setAllowedNetworkIds } = initModalNetworksListContext({
			networks: [ICP_NETWORK],
			allowedNetworkIds: [ICP_NETWORK.id]
		});

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		setNetworks([ICP_NETWORK, ETHEREUM_NETWORK, BASE_NETWORK]);

		expect(get(filteredNetworks)).toEqual([ICP_NETWORK]);

		setAllowedNetworkIds([ETHEREUM_NETWORK.id, BASE_NETWORK.id]);

		expect(get(filteredNetworks)).toEqual([ETHEREUM_NETWORK, BASE_NETWORK]);

		setNetworks([ICP_NETWORK, ETHEREUM_NETWORK, BASE_NETWORK, BSC_MAINNET_NETWORK]);

		expect(get(filteredNetworks)).toEqual([ETHEREUM_NETWORK, BASE_NETWORK]);
	});
});
