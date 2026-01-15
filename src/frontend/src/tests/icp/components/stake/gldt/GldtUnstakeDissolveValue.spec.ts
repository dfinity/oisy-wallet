import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeDissolveValue from '$icp/components/stake/gldt/GldtUnstakeDissolveValue.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('GldtUnstakeDissolveValue', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	it('should switch between selected radio buttons correctly', () => {
		const amount = 1;

		const { getByText } = render(GldtUnstakeDissolveValue, {
			props: { label: 'label', amount },
			context: mockContext()
		});

		expect(getByText(`${amount} ${ICP_TOKEN.symbol}`)).toBeInTheDocument();
	});
});
