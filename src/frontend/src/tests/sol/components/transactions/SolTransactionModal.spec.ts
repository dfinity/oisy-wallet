import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SolTransactionModal from '$sol/components/transactions/SolTransactionModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress2, mockSplAddress } from '$tests/mocks/sol.mock';
import { capitalizeFirstLetter } from '$tests/utils/string-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
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
			value: mockSolTransactionUi.value ?? ZERO,
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

	it('should display tx signature', () => {
		const { getByText, queryByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: SOLANA_TOKEN
		});

		expect(getByText(en.transaction.text.signature)).toBeInTheDocument();

		expect(queryByText(en.transaction.text.hash)).not.toBeInTheDocument();

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

	it('should display the network', () => {
		const { getByText } = render(SolTransactionModal, {
			transaction: mockSolTransactionUi,
			token: BONK_TOKEN
		});

		expect(getByText(get(i18n).networks.network)).toBeInTheDocument();
		expect(getByText(BONK_TOKEN.network.name)).toBeInTheDocument();
	});

	describe('tabs', () => {
		const [base] = createMockSolTransactionsUi(1);

		const transaction = {
			...base,
			fee: 5000n,
			summary: {
				kind: 'send' as const,
				spent: { delta: -1_000_000_000n },
				counterparty: mockSolAddress2
			},
			netChanges: [{ delta: -1_000_000_000n }],
			instructions: [
				{ kind: 'send' as const, amount: 1_000_000_000n, counterparty: mockSolAddress2 }
			]
		};

		it('should speak the summary in the hero', () => {
			const { getByText } = render(SolTransactionModal, {
				props: { transaction, token: SOLANA_TOKEN }
			});

			expect(getByText(en.send.text.send)).toBeInTheDocument();
			expect(getByText('1 SOL')).toBeInTheDocument();
		});

		it('should trade the contact card for the venue on a swap', () => {
			const { getByText, queryByText } = render(SolTransactionModal, {
				props: {
					transaction: {
						...transaction,
						summary: {
							kind: 'swap' as const,
							spent: { delta: -1_000_000_000n },
							received: { delta: 46_099n, tokenAddress: mockSplAddress, decimals: 6 }
						},
						instructions: [
							{
								kind: 'route' as const,
								program: mockSolAddress2,
								children: []
							}
						]
					},
					token: SOLANA_TOKEN
				}
			});

			expect(queryByText(en.address.save.title)).not.toBeInTheDocument();
			expect(getByText(en.transaction.text.interacted_with)).toBeInTheDocument();
			expect(getByText(shortenWithMiddleEllipsis({ text: mockSolAddress2 }))).toBeInTheDocument();
		});

		// The sentence the rows carry, over the figures this view exists to show.
		it('should show the same sentence as the rows, over the pair, in the hero', () => {
			const { getByText } = render(SolTransactionModal, {
				props: {
					transaction: {
						...transaction,
						summary: {
							kind: 'swap' as const,
							spent: { delta: -1_000_000_000n },
							received: { delta: -46_099n, tokenAddress: mockSplAddress, decimals: 6 }
						}
					},
					token: SOLANA_TOKEN
				}
			});

			expect(getByText(`Swap SOL to ${en.transaction.text.unknown_token}`)).toBeInTheDocument();
			expect(getByText(/1 SOL → 0\.046099/)).toBeInTheDocument();
		});

		it('should show only what moved on the balance changes tab', async () => {
			const { getByText, queryByTestId } = render(SolTransactionModal, {
				props: { transaction, token: SOLANA_TOKEN }
			});

			await fireEvent.click(getByText(en.transaction.text.tab_balance_changes));

			expect(getByText('-1 SOL')).toBeInTheDocument();
			// The cost belongs with the transaction's details, not among the amounts it moved.
			expect(queryByTestId('transaction-fee')).not.toBeInTheDocument();
		});

		it('should state the cost at the foot of the summary', () => {
			const { getByTestId } = render(SolTransactionModal, {
				props: {
					transaction: {
						...transaction,
						instructions: [
							{ kind: 'createTokenAccount' as const, account: 'ata', rent: 2_039_280n }
						]
					},
					token: SOLANA_TOKEN
				}
			});

			expect(getByTestId('transaction-fee')).toHaveTextContent('0.000005 SOL');
			expect(getByTestId('transaction-ata-fee')).toHaveTextContent('0.00203928 SOL');
		});

		it('should list the contained instructions on their tab', async () => {
			const { getByText, getByTestId } = render(SolTransactionModal, {
				props: { transaction, token: SOLANA_TOKEN }
			});

			await fireEvent.click(getByText(en.transaction.text.tab_instructions));

			expect(getByTestId('sol-instructions-list')).toBeInTheDocument();
			expect(getByTestId('sol-instruction').textContent).toContain('Send 1 SOL to');
		});

		// Records cached before the redesign carry none of the derived fields.
		it('should say the changes are unavailable for an old record', async () => {
			const { getByText } = render(SolTransactionModal, {
				props: { transaction: base, token: SOLANA_TOKEN }
			});

			await fireEvent.click(getByText(en.transaction.text.tab_balance_changes));

			expect(getByText(en.transaction.text.tab_unavailable)).toBeInTheDocument();
		});
	});

	// Two rows both reading "Unknown token" are worse than an address: nothing tells them apart.
	// The numbering counts off the mints this modal shows, in the order it shows them.
	it('should number the mints it cannot name', () => {
		const { getByText } = render(SolTransactionModal, {
			props: {
				transaction: {
					...mockSolTransactionUi,
					summary: {
						kind: 'swap' as const,
						spent: { delta: -5n, tokenAddress: 'first-unnamed', decimals: 0 },
						received: { delta: 7n, tokenAddress: 'second-unnamed', decimals: 0 }
					},
					netChanges: [
						{ delta: -5n, tokenAddress: 'first-unnamed', decimals: 0 },
						{ delta: 7n, tokenAddress: 'second-unnamed', decimals: 0 }
					]
				},
				token: SOLANA_TOKEN
			}
		});

		expect(
			getByText(
				`Swap ${en.transaction.text.unknown_token} 1 to ${en.transaction.text.unknown_token} 2`
			)
		).toBeInTheDocument();
	});
});
