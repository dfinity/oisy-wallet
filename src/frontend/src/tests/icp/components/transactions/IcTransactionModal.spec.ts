import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransactionModal from '$icp/components/transactions/IcTransactionModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import {
	formatNanosecondsToDate,
	formatToken,
	shortenWithMiddleEllipsis
} from '$lib/utils/format.utils';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

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
			value: mockIcTransactionUi.value ?? ZERO,
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
});
