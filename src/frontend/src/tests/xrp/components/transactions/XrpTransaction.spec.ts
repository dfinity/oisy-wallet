import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { contactsStore } from '$lib/stores/contacts.store';
import { getMockContactsUi } from '$tests/mocks/contacts.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpTransaction from '$xrp/components/transactions/XrpTransaction.svelte';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('XrpTransaction', () => {
	const mockTransaction: XrpTransactionUi = {
		id: 'HASH1',
		type: 'receive',
		status: 'confirmed',
		value: 5_000_000n,
		from: 'rSender',
		to: 'rReceiver',
		timestamp: 1n
	};

	const amountText = (transaction: XrpTransactionUi): string => {
		const { container } = render(XrpTransaction, { props: { transaction, token: XRP_TOKEN } });

		const amountElement = container.querySelector('div.leading-5>span.justify-end');
		assertNonNullish(amountElement);

		return amountElement.textContent ?? '';
	};

	it('renders a negative XRP amount for a send transaction', () => {
		const text = amountText({ ...mockTransaction, type: 'send' });

		expect(text).toContain(XRP_TOKEN.symbol);
		expect(text.startsWith('-')).toBeTruthy();
	});

	it('renders a positive XRP amount for a receive transaction', () => {
		const text = amountText({ ...mockTransaction, type: 'receive' });

		expect(text).toContain(XRP_TOKEN.symbol);
		expect(text.startsWith('+')).toBeTruthy();
	});

	describe('counterparty contact', () => {
		beforeEach(() => {
			contactsStore.set(
				getMockContactsUi({
					n: 1,
					name: 'Alice',
					addresses: [{ addressType: 'Xrp', address: mockXrpAddress, label: 'Cold wallet' }]
				})
			);
		});

		afterEach(() => {
			contactsStore.reset();
		});

		it.each([
			{ type: 'send', counterparty: { to: mockXrpAddress } },
			{ type: 'receive', counterparty: { from: mockXrpAddress } }
		] as const)('shows the contact name and alias for a $type', ({ type, counterparty }) => {
			const { getByText } = render(XrpTransaction, {
				props: { transaction: { ...mockTransaction, type, ...counterparty }, token: XRP_TOKEN }
			});

			expect(getByText('Alice')).toBeInTheDocument();
			expect(getByText('Cold wallet')).toBeInTheDocument();
		});

		// Base58 is case-sensitive: the same letters in another case are another account.
		it('does not match an address that differs only in case', () => {
			const { queryByText } = render(XrpTransaction, {
				props: {
					transaction: { ...mockTransaction, type: 'send', to: mockXrpAddress.toLowerCase() },
					token: XRP_TOKEN
				}
			});

			expect(queryByText('Alice')).toBeNull();
		});
	});
});
