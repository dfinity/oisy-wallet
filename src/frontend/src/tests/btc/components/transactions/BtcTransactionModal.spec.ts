import BtcTransactionModal from '$btc/components/transactions/BtcTransactionModal.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcTransactionUi } from '$tests/mocks/btc-transactions.mock';
import { capitalizeFirstLetter } from '$tests/utils/string-utils';
import { render } from '@testing-library/svelte';

describe('BtcTransactionModal', () => {
	it('should render the BTC transaction modal', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		expect(getByText('receive')).toBeInTheDocument();
	});

	it('should display correct amount and currency', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockBtcTransactionUi.value ?? 0n,
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		})} ${BTC_MAINNET_TOKEN.symbol}`;

		expect(getByText(formattedAmount)).toBeInTheDocument();
	});

	it('should display correct to and from addresses for receive', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		expect(getByText(mockBtcTransactionUi.from)).toBeInTheDocument();
	});

	it('should display transaction status', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		expect(getByText(capitalizeFirstLetter(mockBtcTransactionUi.status))).toBeInTheDocument();
	});

	it('should display block number', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		expect(getByText(mockBtcTransactionUi.blockNumber ?? 0)).toBeInTheDocument();
	});

	it('should display tx hash', () => {
		const { getByText } = render(BtcTransactionModal, {
			transaction: mockBtcTransactionUi,
			token: BTC_MAINNET_TOKEN
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockBtcTransactionUi.id }))
		).toBeInTheDocument();
	});
});
