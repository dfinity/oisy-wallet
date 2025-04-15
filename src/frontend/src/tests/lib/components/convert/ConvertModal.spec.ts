import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider, InfuraProvider: provider, JsonRpcProvider: provider };
});

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

		const firstStepTitle = 'Convert BTC → ICP';

		expect(container).toHaveTextContent(firstStepTitle);

		await fireEvent.click(getByText(en.convert.text.review_button));

		expect(container).toHaveTextContent(en.convert.text.review);

		await fireEvent.click(getByText(en.core.text.back));

		expect(container).toHaveTextContent(firstStepTitle);
	});
});
