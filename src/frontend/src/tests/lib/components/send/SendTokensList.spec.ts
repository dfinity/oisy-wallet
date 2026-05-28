import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendTokensList from '$lib/components/send/SendTokensList.svelte';
import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';
import type { NetworkId } from '$lib/types/network';
import { fireEvent, render } from '@testing-library/svelte';

const renderSendTokensList = ({
	scannerDriven = false,
	lockedNetworkIds,
	onSelectNetworkFilter = vi.fn()
}: {
	scannerDriven?: boolean;
	lockedNetworkIds?: NetworkId[];
	onSelectNetworkFilter?: () => void;
} = {}) =>
	render(SendTokensList, {
		props: {
			onSendToken: vi.fn(),
			onSelectNetworkFilter,
			lockedNetworkIds
		},
		context: new Map<symbol, unknown>([
			[
				MODAL_TOKENS_LIST_CONTEXT_KEY,
				initModalTokensListContext({
					tokens: [BTC_MAINNET_TOKEN],
					filterZeroBalance: false,
					filterNetwork: undefined,
					filterQuery: ''
				})
			],
			[SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY, scannerDriven]
		])
	});

describe('SendTokensList', () => {
	it('does not render the scanned-address notice by default', () => {
		const { queryByTestId, queryByText } = renderSendTokensList();

		expect(queryByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).not.toBeInTheDocument();
		expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
	});

	it('renders the scanned-address notice when the scanner-driven context flag is true', () => {
		const { getByTestId, getByText } = renderSendTokensList({ scannerDriven: true });

		expect(getByTestId(SEND_SCANNED_PLAIN_ADDRESS_NOTICE)).toBeInTheDocument();
		expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
	});

	it('renders the single-token variant when locked to BTC mainnet only', () => {
		const { getByText, queryByText } = renderSendTokensList({
			scannerDriven: true,
			lockedNetworkIds: [BTC_MAINNET_NETWORK_ID]
		});

		expect(
			getByText(en.send.info.scanned_address_only_destination_single_token)
		).toBeInTheDocument();
		expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
	});

	it('renders the multi-token variant when locked to a single non-BTC network', () => {
		const { getByText, queryByText } = renderSendTokensList({
			scannerDriven: true,
			lockedNetworkIds: [ICP_NETWORK_ID]
		});

		expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
		expect(
			queryByText(en.send.info.scanned_address_only_destination_single_token)
		).not.toBeInTheDocument();
		expect(
			queryByText(en.send.info.scanned_address_only_destination_multi_network)
		).not.toBeInTheDocument();
	});

	it('renders the multi-network variant when locked to multiple EVM mainnets', () => {
		const { getByText, queryByText } = renderSendTokensList({
			scannerDriven: true,
			lockedNetworkIds: [ETHEREUM_NETWORK_ID, ...SUPPORTED_EVM_MAINNET_NETWORK_IDS]
		});

		expect(
			getByText(en.send.info.scanned_address_only_destination_multi_network)
		).toBeInTheDocument();
		expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
		expect(
			queryByText(en.send.info.scanned_address_only_destination_single_token)
		).not.toBeInTheDocument();
	});

	describe('network filter button interactivity', () => {
		it('disables the filter button when locked to a single network', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({
				scannerDriven: true,
				lockedNetworkIds: [BTC_MAINNET_NETWORK_ID],
				onSelectNetworkFilter
			});

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeDisabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).not.toHaveBeenCalled();
		});

		it('keeps the filter button interactive when locked to multiple networks so the user can drill down', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({
				scannerDriven: true,
				lockedNetworkIds: [ETHEREUM_NETWORK_ID, ...SUPPORTED_EVM_MAINNET_NETWORK_IDS],
				onSelectNetworkFilter
			});

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).toHaveBeenCalledOnce();
		});

		it('keeps the filter button interactive when no lock is set', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({ onSelectNetworkFilter });

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).toHaveBeenCalledOnce();
		});
	});
});
