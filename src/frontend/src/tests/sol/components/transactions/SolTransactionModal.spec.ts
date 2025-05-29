import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { capitalizeFirstLetter } from '$tests/utils/string-utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const [mockSolTransactionUi] = createMockSolTransactionsUi(1);

describe('SolTransactionModal', () => {
	it('should render the SOL transaction modal', () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		expect(getByText('send')).toBeInTheDocument();
	});

	it('should display correct amount and currency', () => {
		const { getAllByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockSolTransactionUi.value ?? 0n,
			unitName: SOLANA_TOKEN.decimals,
			displayDecimals: SOLANA_TOKEN.decimals
		})} ${SOLANA_TOKEN.symbol}`;

		expect(getAllByText(formattedAmount)[0]).toBeInTheDocument();
	});

	it('should display correct to and from addresses for send', () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		expect(getByText(mockSolTransactionUi.to as string)).toBeInTheDocument();
	});

	it('should display tx status', () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		const statusTranslation = get(i18n).transaction.status;

		expect(
			getByText(
				capitalizeFirstLetter(
					statusTranslation[mockSolTransactionUi.status as keyof typeof statusTranslation]
				)
			)
		).toBeInTheDocument();
	});

	it('should display tx hash', () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockSolTransactionUi.signature }))
		).toBeInTheDocument();
	});
});
