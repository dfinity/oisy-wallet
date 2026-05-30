import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendTokensList from '$lib/components/send/SendTokensList.svelte';
import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';
import type { Network } from '$lib/types/network';
import { fireEvent, render } from '@testing-library/svelte';

const renderSendTokensList = ({
	scannerDriven = false,
	allowedNetworks,
	onSelectNetworkFilter = vi.fn()
}: {
	scannerDriven?: boolean;
	allowedNetworks?: Network[];
	onSelectNetworkFilter?: () => void;
} = {}) =>
	render(SendTokensList, {
		props: {
			onSendToken: vi.fn(),
			onSelectNetworkFilter,
			allowedNetworks
		},
		context: new Map<symbol, unknown>([
			[
				MODAL_TOKENS_LIST_CONTEXT_KEY,
				initModalTokensListContext({
					tokens: [BTC_MAINNET_TOKEN],
					filterZeroBalance: false,
					selectedFilterNetwork: undefined,
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

	describe('network filter button auto-lock', () => {
		it('disables the filter button when locked to a single network (BTC mainnet)', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({
				allowedNetworks: [BTC_MAINNET_NETWORK],
				onSelectNetworkFilter
			});

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeDisabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).not.toHaveBeenCalled();
		});

		it('disables the filter button when locked to a single network (Ethereum, URL-route case)', () => {
			const { getByRole } = renderSendTokensList({
				allowedNetworks: [ETHEREUM_NETWORK]
			});

			expect(getByRole('button', { name: en.networks.chain_fusion })).toBeDisabled();
		});

		it('keeps the filter button interactive when multiple networks are allowed', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({
				allowedNetworks: [ETHEREUM_NETWORK, BASE_NETWORK, ARBITRUM_MAINNET_NETWORK],
				onSelectNetworkFilter
			});

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).toHaveBeenCalledOnce();
		});

		it('keeps the filter button interactive when no restriction is set', async () => {
			const onSelectNetworkFilter = vi.fn();
			const { getByRole } = renderSendTokensList({ onSelectNetworkFilter });

			const button = getByRole('button', { name: en.networks.chain_fusion });

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			expect(onSelectNetworkFilter).toHaveBeenCalledOnce();
		});
	});

	describe('BTC single-token notice variant', () => {
		it('renders the single-token copy when locked to BTC mainnet', () => {
			const { getByText, queryByText } = renderSendTokensList({
				scannerDriven: true,
				allowedNetworks: [BTC_MAINNET_NETWORK]
			});

			expect(
				getByText(en.send.info.scanned_address_only_destination_single_token)
			).toBeInTheDocument();
			expect(queryByText(en.send.info.scanned_address_only_destination)).not.toBeInTheDocument();
		});

		it('renders the default multi-token copy when locked to a non-BTC network', () => {
			const { getByText, queryByText } = renderSendTokensList({
				scannerDriven: true,
				allowedNetworks: [ICP_NETWORK]
			});

			expect(getByText(en.send.info.scanned_address_only_destination)).toBeInTheDocument();
			expect(
				queryByText(en.send.info.scanned_address_only_destination_single_token)
			).not.toBeInTheDocument();
		});
	});
});
