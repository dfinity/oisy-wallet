import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { render } from '@testing-library/svelte';

const [mockIcTransactionUi] = createMockIcTransactionsUi(1);

describe('IcTransactionModal', () => {
	it('should render the IC transaction modal', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		expect(getByText('send')).toBeInTheDocument();
	});

	it('should display correct amount and currency', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockIcTransactionUi.value ?? 0n,
			unitName: ICP_TOKEN.decimals,
			displayDecimals: ICP_TOKEN.decimals
		})} ${ICP_TOKEN.symbol}`;

		expect(getByText(formattedAmount)).toBeInTheDocument();
	});

	it('should display correct to and from addresses for send', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		expect(getByText(mockIcTransactionUi.to as string)).toBeInTheDocument();
	});

	it('should display tx id', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockIcTransactionUi.id }))
		).toBeInTheDocument();
	});
});
