import { ICP_EXPLORER_URL } from '$env/explorers.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
import { isIcrcTokenSupportIcrc3 } from '$icp/services/icrc.services';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import {
	formatNanosecondsToDate,
	formatToken,
	shortenWithMiddleEllipsis
} from '$lib/utils/format.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import { mockValidDip20Token, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock(import('$icp/services/icrc.services'), async (importOriginal) => ({
	...(await importOriginal()),
	isIcrcTokenSupportIcrc3: vi.fn()
}));

const [mockIcTransactionUi] = createMockIcTransactionsUi(1);

describe('IcTransactionModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.mocked(isIcrcTokenSupportIcrc3).mockResolvedValue(false);
	});

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
			value: mockIcTransactionUi.value ?? ZERO,
			unitName: ICP_TOKEN.decimals,
			displayDecimals: ICP_TOKEN.decimals,
			showPlusSign: mockIcTransactionUi.type === 'receive'
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

	it('should display the network', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		expect(getByText(get(i18n).networks.network)).toBeInTheDocument();
		expect(getByText(ICP_TOKEN.network.name)).toBeInTheDocument();
	});

	it('should display the fee', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: mockIcTransactionUi,
			token: ICP_TOKEN
		});

		const formattedAmount = `${formatToken({
			value: mockIcTransactionUi.fee ?? ZERO,
			unitName: ICP_TOKEN.decimals,
			displayDecimals: ICP_TOKEN.decimals
		})} ${ICP_TOKEN.symbol}`;

		expect(getByText(get(i18n).fee.text.fee)).toBeInTheDocument();
		expect(getByText(formattedAmount)).toBeInTheDocument();
	});

	it('should display the spender expiration if approve transaction', () => {
		const { getByText } = render(IcTransactionModal, {
			transaction: {
				...mockIcTransactionUi,
				approveExpiresAt: 1754910013783000000n,
				approveSpender: 'a498bfac62d235242a60c2141bdad25c7924b62676af755286fa3b8eead72889',
				type: 'approve'
			},
			token: ICP_TOKEN
		});

		expect(getByText(get(i18n).transaction.text.expiration)).toBeInTheDocument();
		expect(
			getByText(formatNanosecondsToDate({ nanoseconds: 1754910013783000000n }))
		).toBeInTheDocument();
	});

	describe('TCYCLES top-ups', () => {
		const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

		const topUp = {
			...mockIcTransactionUi,
			type: 'burn' as const,
			typeLabel: 'transaction.label.top_up',
			to: canister
		};

		it('should title a top-up as one and name its canister', () => {
			const { container, getByText } = render(IcTransactionModal, {
				transaction: topUp,
				token: mockTcyclesToken
			});

			expect(container).toHaveTextContent(get(i18n).transaction.label.top_up);
			expect(container).not.toHaveTextContent(/\bburn\b/);
			expect(getByText(canister)).toBeInTheDocument();
		});

		it('should title a top-up refund as one', () => {
			const { container } = render(IcTransactionModal, {
				transaction: {
					...mockIcTransactionUi,
					type: 'mint' as const,
					typeLabel: 'transaction.label.top_up_refund'
				},
				token: mockTcyclesToken
			});

			expect(container).toHaveTextContent(get(i18n).transaction.label.top_up_refund);
			expect(container).not.toHaveTextContent(/\bmint\b/);
		});

		it('should keep the plain type on another ledger', () => {
			const { getByText } = render(IcTransactionModal, {
				transaction: topUp,
				token: mockValidIcrcToken
			});

			expect(getByText('burn')).toBeInTheDocument();
		});
	});

	describe('transaction ID link', () => {
		const ledgerCanisterId = '2ouva-viaaa-aaaaq-aaamq-cai';

		const icrcToken = { ...mockValidIcrcToken, ledgerCanisterId };

		const transaction = { ...mockIcTransactionUi, id: '42' };

		const linkLabel = get(i18n).transaction.alt.open_block_explorer;

		it('should link the block on the dashboard when the ledger serves ICRC-3', async () => {
			vi.mocked(isIcrcTokenSupportIcrc3).mockResolvedValue(true);

			const { getByRole } = render(IcTransactionModal, { transaction, token: icrcToken });

			await waitFor(() =>
				expect(getByRole('link', { name: linkLabel })).toHaveAttribute(
					'href',
					`${ICP_EXPLORER_URL}/tokens/${ledgerCanisterId}/tx/42`
				)
			);

			expect(isIcrcTokenSupportIcrc3).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId
			});
		});

		it('should link the block index for the receive half of a transfer to self', async () => {
			vi.mocked(isIcrcTokenSupportIcrc3).mockResolvedValue(true);

			const { getByRole } = render(IcTransactionModal, {
				transaction: { ...transaction, id: '42-self' },
				token: icrcToken
			});

			await waitFor(() =>
				expect(getByRole('link', { name: linkLabel })).toHaveAttribute(
					'href',
					`${ICP_EXPLORER_URL}/tokens/${ledgerCanisterId}/tx/42`
				)
			);
		});

		it('should keep the copy button only when the ledger does not serve ICRC-3', async () => {
			const { queryByRole } = render(IcTransactionModal, { transaction, token: icrcToken });

			await waitFor(() => expect(isIcrcTokenSupportIcrc3).toHaveBeenCalledOnce());

			expect(queryByRole('link', { name: linkLabel })).not.toBeInTheDocument();
		});

		it('should keep the copy button only when the ledger cannot be asked', async () => {
			vi.mocked(isIcrcTokenSupportIcrc3).mockRejectedValue(new Error('ledger unreachable'));

			const { queryByRole } = render(IcTransactionModal, { transaction, token: icrcToken });

			await waitFor(() => expect(isIcrcTokenSupportIcrc3).toHaveBeenCalledOnce());

			expect(queryByRole('link', { name: linkLabel })).not.toBeInTheDocument();
		});

		it('should keep the link the mapper set without asking the ledger', () => {
			const txExplorerUrl = `${ICP_EXPLORER_URL}/transaction/42`;

			const { getByRole } = render(IcTransactionModal, {
				transaction: { ...transaction, txExplorerUrl },
				token: ICP_TOKEN
			});

			expect(getByRole('link', { name: linkLabel })).toHaveAttribute('href', txExplorerUrl);
			expect(isIcrcTokenSupportIcrc3).not.toHaveBeenCalled();
		});

		it('should not ask a DIP20 canister', () => {
			const { queryByRole } = render(IcTransactionModal, {
				transaction,
				token: mockValidDip20Token
			});

			expect(queryByRole('link', { name: linkLabel })).not.toBeInTheDocument();
			expect(isIcrcTokenSupportIcrc3).not.toHaveBeenCalled();
		});
	});

	describe('approve spender link', () => {
		const spenderLabel = get(i18n).transaction.alt.open_for_block_explorer;

		const approve = { ...mockIcTransactionUi, type: 'approve' as const };

		it('should link an ICRC spender to its account page on the ledger', () => {
			const ledgerCanisterId = '2ouva-viaaa-aaaaq-aaamq-cai';
			const icrcToken = { ...mockValidIcrcToken, ledgerCanisterId };
			const spender =
				'2jvtu-yqaaa-aaaaq-aaama-cai-mj6qsda.29cdfecd0adc7575bfaee5d32884308ef53271bb348c7d287e9f62142c8e9bb3';

			const { getByRole } = render(IcTransactionModal, {
				transaction: { ...approve, approveSpender: spender },
				token: icrcToken
			});

			expect(getByRole('link', { name: spenderLabel })).toHaveAttribute(
				'href',
				`${ICP_EXPLORER_URL}/tokens/${ledgerCanisterId}/account/${spender}`
			);
		});

		it('should keep the spender link the ICP mapper set', () => {
			const spender = 'a498bfac62d235242a60c2141bdad25c7924b62676af755286fa3b8eead72889';
			const approveSpenderExplorerUrl = `${ICP_EXPLORER_URL}/account/${spender}`;

			const { getByRole } = render(IcTransactionModal, {
				transaction: { ...approve, approveSpender: spender, approveSpenderExplorerUrl },
				token: ICP_TOKEN
			});

			expect(getByRole('link', { name: spenderLabel })).toHaveAttribute(
				'href',
				approveSpenderExplorerUrl
			);
		});

		it('should not link the spender of a DIP20 approval', () => {
			const { queryByRole } = render(IcTransactionModal, {
				transaction: { ...approve, approveSpender: 'ryjl3-tyaaa-aaaaa-aaaba-cai' },
				token: mockValidDip20Token
			});

			expect(queryByRole('link', { name: spenderLabel })).not.toBeInTheDocument();
		});
	});

	describe('ICP top-ups', () => {
		it('should title a canister top-up as one', () => {
			const { container } = render(IcTransactionModal, {
				transaction: {
					...mockIcTransactionUi,
					type: 'send' as const,
					typeLabel: 'transaction.label.canister_top_up'
				},
				token: ICP_TOKEN
			});

			expect(container).toHaveTextContent(get(i18n).transaction.label.canister_top_up);
			expect(container).not.toHaveTextContent(/\bsend\b/);
		});
	});
});
