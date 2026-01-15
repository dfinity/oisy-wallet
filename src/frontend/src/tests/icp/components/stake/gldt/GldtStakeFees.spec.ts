import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeFees from '$icp/components/stake/gldt/GldtStakeFees.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GldtStakeFees', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				{ ...initSendContext({ token: ICP_TOKEN }), sendTokenExchangeRate: readable(200) }
			]
		]);

	it('should display correct values', () => {
		const { container } = render(GldtStakeFees, {
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.fee.text.transaction_fees);
		expect(container).toHaveTextContent('$0.04');

		expect(container).toHaveTextContent(en.fee.text.network_fee);
		expect(container).toHaveTextContent(en.fee.text.approval_fee);
		expect(container).toHaveTextContent('0.0001 ICP');
	});
});
