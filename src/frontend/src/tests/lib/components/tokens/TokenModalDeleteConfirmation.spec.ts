import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { render, waitFor } from '@testing-library/svelte';

describe('TokenModalDeleteConfirmation', () => {
	it('renders correct token symbol', () => {
		const { container } = render(TokenModalDeleteConfirmation, {
			props: {
				token: ICP_TOKEN,
				onCancel: () => {},
				onConfirm: () => {}
			}
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(ICP_TOKEN));
	});

	it('shows the token symbol as plain text', async () => {
		const symbol =
			'</span><h1>Title</h1><img src="https://example.com/a.png"><a href="https://example.com">link</a><span>';

		const { container } = render(TokenModalDeleteConfirmation, {
			props: {
				token: { ...ICP_TOKEN, symbol },
				onCancel: () => {},
				onConfirm: () => {}
			}
		});

		await waitFor(() => {
			expect(container.querySelector('span.font-bold')?.textContent).toBe(symbol);
		});

		expect(container.querySelector('h1')).toBeNull();
		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('a')).toBeNull();
	});
});
