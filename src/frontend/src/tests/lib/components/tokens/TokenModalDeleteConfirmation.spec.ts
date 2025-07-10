import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import TokenModalDeleteConfirmation from '$lib/components/tokens/TokenModalDeleteConfirmation.svelte';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { render } from '@testing-library/svelte';

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
});
