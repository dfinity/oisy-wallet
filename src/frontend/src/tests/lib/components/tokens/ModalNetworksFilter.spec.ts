import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import ModalNetworksFilter from '$lib/components/tokens/ModalNetworksFilter.svelte';
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
			expect(() => getByText(network.name)).toThrowError();
		});
	});
});
