import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
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
});
