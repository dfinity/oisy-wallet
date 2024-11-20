import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens.env';
import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('ConvertModal', () => {
	const mockContext = () =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(BTC_MAINNET_TOKEN),
					destinationToken: readable(ICP_TOKEN)
				}
			]
		]);

	it('should display correct modal title after navigating between steps', async () => {
		const { container, getByText } = render(ConvertModal, {
			context: mockContext()
		});
		const firstStepTitle = 'Swap BTC → ICP';

		expect(container).toHaveTextContent(firstStepTitle);

		await fireEvent.click(getByText(en.convert.text.review_button));
		expect(container).toHaveTextContent(en.convert.text.review);

		await fireEvent.click(getByText(en.core.text.back));
		expect(container).toHaveTextContent(firstStepTitle);
	});
});
