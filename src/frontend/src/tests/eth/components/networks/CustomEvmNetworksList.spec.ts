import CustomEvmNetworksList from '$eth/components/networks/CustomEvmNetworksList.svelte';
import { customEvmNetworksStore } from '$eth/stores/custom-evm-networks.store';
import {
	CUSTOM_EVM_NETWORKS_LIST,
	CUSTOM_EVM_NETWORKS_LIST_EMPTY,
	CUSTOM_EVM_NETWORKS_REMOVE_BUTTON
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('CustomEvmNetworksList', () => {
	beforeEach(() => {
		customEvmNetworksStore.reset();
	});

	it('renders an empty-state message when no custom networks are saved', () => {
		const { getByTestId, queryByTestId } = render(CustomEvmNetworksList);

		expect(getByTestId(CUSTOM_EVM_NETWORKS_LIST_EMPTY)).toHaveTextContent(
			en.custom_networks.text.list_empty
		);
		expect(queryByTestId(CUSTOM_EVM_NETWORKS_LIST)).toBeNull();
	});

	it('renders a row per saved network with name, chain ID, env and RPC URL', () => {
		customEvmNetworksStore.add({
			name: 'Optimism',
			chainId: 10n,
			rpcUrl: 'https://mainnet.optimism.io',
			currencySymbol: 'ETH',
			explorerUrl: 'https://optimistic.etherscan.io',
			env: 'mainnet'
		});
		customEvmNetworksStore.add({
			name: 'Polygon Mumbai',
			chainId: 80001n,
			rpcUrl: 'https://rpc-mumbai.maticvigil.com',
			currencySymbol: 'MATIC',
			explorerUrl: 'https://mumbai.polygonscan.com',
			env: 'testnet'
		});

		const { getByTestId, getByText } = render(CustomEvmNetworksList);

		expect(getByTestId(CUSTOM_EVM_NETWORKS_LIST)).toBeInTheDocument();
		expect(getByText('Optimism')).toBeInTheDocument();
		expect(getByText('Polygon Mumbai')).toBeInTheDocument();
		expect(getByText('https://mainnet.optimism.io')).toBeInTheDocument();
		expect(getByText('https://rpc-mumbai.maticvigil.com')).toBeInTheDocument();
		// chainId + env rendered in the sub-label; check one to avoid over-coupling.
		expect(
			getByText(
				`${en.custom_networks.text.list_chain_id_label.replace('$chainId', '10')} · ${en.custom_networks.text.mainnet}`
			)
		).toBeInTheDocument();
	});

	it('requires two clicks to remove and commits only on confirmation', async () => {
		// Two-step inline confirm guards against accidental deletion of a
		// painstakingly-typed entry. First click arms the row (button text
		// switches to the confirm string); second click removes.
		customEvmNetworksStore.add({
			name: 'Optimism',
			chainId: 10n,
			rpcUrl: 'https://mainnet.optimism.io',
			currencySymbol: 'ETH',
			explorerUrl: 'https://optimistic.etherscan.io',
			env: 'mainnet'
		});

		const { getByTestId } = render(CustomEvmNetworksList);
		const removeButton = getByTestId(`${CUSTOM_EVM_NETWORKS_REMOVE_BUTTON}-10`);

		expect(removeButton).toHaveTextContent(en.custom_networks.button.remove);
		expect(get(customEvmNetworksStore)).toHaveLength(1);

		await fireEvent.click(removeButton);

		expect(removeButton).toHaveTextContent(en.custom_networks.button.confirm_remove);
		expect(get(customEvmNetworksStore)).toHaveLength(1);

		await fireEvent.click(removeButton);

		expect(get(customEvmNetworksStore)).toHaveLength(0);
	});

	it('switches the armed row when a different remove button is clicked', async () => {
		// Only one row should ever be armed. Clicking Remove on row B while A
		// is armed should disarm A — otherwise a user could confirm the
		// "wrong" row by clicking A's Confirm button after switching focus.
		customEvmNetworksStore.add({
			name: 'Optimism',
			chainId: 10n,
			rpcUrl: 'https://mainnet.optimism.io',
			currencySymbol: 'ETH',
			explorerUrl: 'https://optimistic.etherscan.io',
			env: 'mainnet'
		});
		customEvmNetworksStore.add({
			name: 'Arbitrum',
			chainId: 42161n,
			rpcUrl: 'https://arb1.arbitrum.io/rpc',
			currencySymbol: 'ETH',
			explorerUrl: 'https://arbiscan.io',
			env: 'mainnet'
		});

		const { getByTestId } = render(CustomEvmNetworksList);
		const buttonA = getByTestId(`${CUSTOM_EVM_NETWORKS_REMOVE_BUTTON}-10`);
		const buttonB = getByTestId(`${CUSTOM_EVM_NETWORKS_REMOVE_BUTTON}-42161`);

		await fireEvent.click(buttonA);

		expect(buttonA).toHaveTextContent(en.custom_networks.button.confirm_remove);
		expect(buttonB).toHaveTextContent(en.custom_networks.button.remove);

		await fireEvent.click(buttonB);

		expect(buttonA).toHaveTextContent(en.custom_networks.button.remove);
		expect(buttonB).toHaveTextContent(en.custom_networks.button.confirm_remove);

		// Neither row has actually been removed yet — both are still present.
		expect(get(customEvmNetworksStore)).toHaveLength(2);
	});
});
