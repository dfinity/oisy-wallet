import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcSendReview from '$icp/components/send/IcSendReview.svelte';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('IcSendReview', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ICP_TOKEN
		})
	);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: 22_000_000
	};

	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByText } = render(IcSendReview, {
			props,
			context: mockContext
		});

		expect(container).toHaveTextContent(`${props.amount} ${ICP_TOKEN.symbol}`);

		expect(getByText(en.send.text.network)).toBeInTheDocument();

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});
});
