import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendTokensList from '$lib/components/send/SendTokensList.svelte';
import { SEND_SCANNED_PLAIN_ADDRESS_NOTICE } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { SCANNED_PLAIN_ADDRESS_SEND_CONTEXT_KEY } from '$lib/stores/scanned-plain-address-send.store';
import { render } from '@testing-library/svelte';

const renderSendTokensList = ({ scannerDriven = false }: { scannerDriven?: boolean } = {}) =>
	render(SendTokensList, {
		props: {
			onSendToken: vi.fn(),
			onSelectNetworkFilter: vi.fn()
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
});
