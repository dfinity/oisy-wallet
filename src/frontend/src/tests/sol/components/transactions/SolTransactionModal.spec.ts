import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress2 } from '$tests/mocks/sol.mock';
import { capitalizeFirstLetter } from '$tests/utils/string-utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SolTransactionModal', () => {
	const [mockSolTransactionUi] = createMockSolTransactionsUi(1);

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

	it('should display correct to and from addresses for send', async () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		await waitFor(() => {
			expect(getByText(mockSolTransactionUi.to as string)).toBeInTheDocument();
		});
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

	it('should not display ATA address if there is no owner address', () => {
		const { queryByText } = render(SolTransactionModal, {
			transaction: { ...mockSolTransactionUi, fromOwner: undefined, toOwner: undefined },
			token: SOLANA_TOKEN
		});

		expect(queryByText(en.transaction.text.from_ata)).not.toBeInTheDocument();
		expect(queryByText(en.transaction.text.to_ata)).not.toBeInTheDocument();

		expect(queryByText('mock-owner-address')).not.toBeInTheDocument();
	});

	it('should display ATA address if there is the owner address even if it is not SPL token', () => {
		const { queryByText } = render(SolTransactionModal, {
			transaction: { ...mockSolTransactionUi, toOwner: 'mock-owner-address' },
			token: SOLANA_TOKEN
		});

		expect(queryByText(en.transaction.text.from_ata)).not.toBeInTheDocument();

		expect(queryByText(en.transaction.text.to_ata)).toBeInTheDocument();

		expect(queryByText('mock-owner-address')).toBeInTheDocument();
	});

	it('should display ATA address if is SPL token', async () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: { ...mockSolTransactionUi, toOwner: mockSolAddress2 },
			token: BONK_TOKEN
		});

		await waitFor(() => {
			expect(getByText(en.transaction.text.to_ata)).toBeInTheDocument();

			expect(getByText(mockSolAddress2)).toBeInTheDocument();

			expect(
				getByText(shortenWithMiddleEllipsis({ text: mockSolTransactionUi.to as string }))
			).toBeInTheDocument();
		});
	});
});
