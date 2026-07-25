import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import XrpTransactionModal from '$xrp/components/transactions/XrpTransactionModal.svelte';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { render } from '@testing-library/svelte';

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

	it('does not render a destination-tag row when the transaction has none', () => {
		const { container } = render(XrpTransactionModal, {
			props: { transaction: { ...transaction, destinationTag: undefined }, token: XRP_TOKEN }
		});

		expect(container.textContent).not.toContain('12345');
	});
});
