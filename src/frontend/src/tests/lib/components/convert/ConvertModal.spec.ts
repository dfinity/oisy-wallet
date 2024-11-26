import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ConvertModal', () => {
	const props = {
		sourceToken: BTC_MAINNET_TOKEN,
		destinationToken: ICP_TOKEN
	};

	it('should display correct modal title after navigating between steps', async () => {
		const { container, getByText } = render(ConvertModal, {
			props,
			context: new Map([[UTXOS_FEE_CONTEXT_KEY, { store: initUtxosFeeStore() }]])
		});

		const firstStepTitle = 'Swap BTC → ICP';

		expect(container).toHaveTextContent(firstStepTitle);

		await fireEvent.click(getByText(en.convert.text.review_button));
		expect(container).toHaveTextContent(en.convert.text.review);

		await fireEvent.click(getByText(en.core.text.back));
		expect(container).toHaveTextContent(firstStepTitle);
	});
});
