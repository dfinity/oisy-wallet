import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';

describe('IcTokenFee', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ICP_TOKEN
		})
	);

	it('renders provided token fee', () => {
		const { container } = render(IcTokenFee, {
			context: mockContext
		});

		expect(container).toHaveTextContent(
			`${formatToken({ value: ICP_TOKEN.fee, displayDecimals: ICP_TOKEN.decimals, unitName: ICP_TOKEN.decimals })} ${ICP_TOKEN.symbol}`
		);
	});
});
