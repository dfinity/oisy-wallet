import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { i18n } from '$lib/stores/i18n.store';
import XrpTransactionModal from '$xrp/components/transactions/XrpTransactionModal.svelte';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpTransactionModal', () => {
	const transaction: XrpTransactionUi = {
		id: 'ABC123DEF456GHI789',
		type: 'receive',
		status: 'confirmed',
		value: 5_000_000n,
		from: 'rSenderAddress',
		to: 'rReceiverAddress',
		timestamp: 1n,
		blockNumber: 42,
		destinationTag: 12345
	};

	it('renders the destination tag and the ledger index (block number)', () => {
		const { container } = render(XrpTransactionModal, {
			props: { transaction, token: XRP_TOKEN }
		});

		expect(container.textContent).toContain('12345');
		expect(container.textContent).toContain('42');
	});

	// The subtitle is user-visible, so it must come from the locale rather than the union literal.
	it.each(['receive', 'send'] as const)('renders the localized label for a %s', (type) => {
		const { getByText } = render(XrpTransactionModal, {
			props: { transaction: { ...transaction, type }, token: XRP_TOKEN }
		});

		expect(getByText(get(i18n).transaction.type[type])).toBeTruthy();
	});

	// The mapper attributes a fee only to the sending account, so a fee present means an outgoing
	// payment — and the detail view is the one place its full cost should be visible.
	it('renders the fee of an outgoing payment', () => {
		const { container, getByText } = render(XrpTransactionModal, {
			props: {
				transaction: { ...transaction, type: 'send', fee: 12n },
				token: XRP_TOKEN
			}
		});

		expect(getByText(get(i18n).fee.text.fee)).toBeTruthy();

		expect(container.textContent).toContain('0.000012');
	});

	it('does not render a fee row for a received payment', () => {
		const { queryByText } = render(XrpTransactionModal, {
			props: { transaction, token: XRP_TOKEN }
		});

		expect(queryByText(get(i18n).fee.text.fee)).toBeNull();
	});

	it('does not render a destination-tag row when the transaction has none', () => {
		const { container } = render(XrpTransactionModal, {
			props: { transaction: { ...transaction, destinationTag: undefined }, token: XRP_TOKEN }
		});

		expect(container.textContent).not.toContain('12345');
	});
});
