import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeTokenFeeModalValue from '$icp/components/stake/gldt/GldtStakeTokenFeeModalValue.svelte';
import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeTokenFeeModalValue', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	it('renders provided token fee', () => {
		const { container } = render(GldtStakeTokenFeeModalValue, {
			context: mockContext(),
			props: {
				label: mockSnippet
			}
		});

		expect(container).toHaveTextContent(
			`${formatToken({ value: ICP_TOKEN.fee, displayDecimals: ICP_TOKEN.decimals, unitName: ICP_TOKEN.decimals })} ${ICP_TOKEN.symbol}`
		);
		expect(container).toHaveTextContent('< $0.01');
	});
});
