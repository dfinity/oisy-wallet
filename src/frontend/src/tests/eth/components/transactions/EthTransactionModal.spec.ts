import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransactionModal from '$eth/components/transactions/EthTransactionModal.svelte';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { render } from '@testing-library/svelte';

const [mockEthTransactionUi] = createMockEthTransactionsUi(1);

describe('EthTransactionModal', () => {
	it('should render the ETH transaction modal', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText('send')).toBeInTheDocument();
	});

	it('should display correct amount and currency', () => {
		const { getAllByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockEthTransactionUi.value ?? 0n,
			unitName: ETHEREUM_TOKEN.decimals,
			displayDecimals: ETHEREUM_TOKEN.decimals
		})} ${ETHEREUM_TOKEN.symbol}`;

		expect(getAllByText(formattedAmount)[0]).toBeInTheDocument();
	});

	it('should display correct to and from addresses for send', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(mockEthTransactionUi.to as string)).toBeInTheDocument();
	});

	it('should display tx block number', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(getByText(mockEthTransactionUi.blockNumber as number)).toBeInTheDocument();
	});

	it('should display tx hash', () => {
		const { getByText } = render(EthTransactionModal, {
			transaction: mockEthTransactionUi,
			token: ETHEREUM_TOKEN
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockEthTransactionUi.hash as string }))
		).toBeInTheDocument();
	});
});
