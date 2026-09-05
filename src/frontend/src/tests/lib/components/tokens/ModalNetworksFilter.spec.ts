import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
import en from '$lib/i18n/en.json';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import type { Network } from '$lib/types/network';
import { render } from '@testing-library/svelte';

const networks: Network[] = [BTC_MAINNET_NETWORK, ETHEREUM_NETWORK, ICP_NETWORK];

describe('ModalNetworksFilter', () => {
	const props = {
		allNetworksEnabled: true,
		filteredNetworks: networks,
		onNetworkFilter: () => {}
	};

	const mockContext = () => {
		const result = new Map();

		result.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [ICP_TOKEN] }));

		return result;
	};

	it('renders networks', () => {
		const { getByText } = render(ModalNetworksFilter, {
			props,
			context: mockContext()
		});

		networks.forEach((network) => {
			expect(getByText(network.name)).toBeInTheDocument();
		});
	});

	it('does not render networks if they are not provided', () => {
		const { getByText } = render(ModalNetworksFilter, {
			props: {
				...props,
				filteredNetworks: []
			},
			context: mockContext()
		});

		networks.forEach((network) => {
			expect(() => getByText(network.name)).toThrow();
		});
	});

	it('renders the default "All networks" label on the all-networks entry when no override is set', () => {
		const { getByText } = render(ModalNetworksFilter, {
			props,
			context: mockContext()
		});

		expect(getByText(en.networks.chain_fusion)).toBeInTheDocument();
	});

	it('renders the allNetworksLabel override on the all-networks entry when provided', () => {
		const { getByText, queryByText } = render(ModalNetworksFilter, {
			props: {
				...props,
				allNetworksLabel: en.networks.evm_networks
			},
			context: mockContext()
		});

		expect(getByText(en.networks.evm_networks)).toBeInTheDocument();
		expect(queryByText(en.networks.chain_fusion)).not.toBeInTheDocument();
	});
});
