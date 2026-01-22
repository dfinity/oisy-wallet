import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { ALL_UTXOS_CONTEXT_KEY, initAllUtxosStore } from '$btc/stores/all-utxos.store';
import {
	FEE_RATE_PERCENTILES_CONTEXT_KEY,
	initFeeRatePercentilesStore
} from '$btc/stores/fee-rate-percentiles.store';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import ConvertModal from '$lib/components/convert/ConvertModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ConvertModal', () => {
	const props = {
		sourceToken: BTC_MAINNET_TOKEN,
		destinationToken: ICP_TOKEN
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
	});

	it('should display correct modal title after navigating between steps', async () => {
		const { container, getByText, getByTestId } = render(ConvertModal, {
			props,
			context: new Map([
				[UTXOS_FEE_CONTEXT_KEY, { store: initUtxosFeeStore() }],
				[ALL_UTXOS_CONTEXT_KEY, { store: initAllUtxosStore() }],
				[FEE_RATE_PERCENTILES_CONTEXT_KEY, { store: initFeeRatePercentilesStore() }]
			])
		});

		const firstStepTitle = 'Convert BTC → ICP';

		expect(container).toHaveTextContent(firstStepTitle);

		await fireEvent.click(getByTestId('convert-form-button-next'));

		expect(container).toHaveTextContent(en.convert.text.review);

		await fireEvent.click(getByText(en.core.text.back));

		expect(container).toHaveTextContent(firstStepTitle);
	});
});
