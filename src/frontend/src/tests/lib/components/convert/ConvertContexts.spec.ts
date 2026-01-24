import * as btcUtxosUtils from '$btc/utils/btc-utxos.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY } from '$lib/stores/token-action-validation-errors.store';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import * as sveltePackage from 'svelte';
import { setContext } from 'svelte';

describe('ConvertContexts', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(sveltePackage, 'setContext');
		vi.spyOn(btcUtxosUtils, 'resetUtxosDataStores').mockImplementation(() => {});
	});

	const defaultProps = {
		sourceToken: ICP_TOKEN,
		destinationToken: ETHEREUM_TOKEN,
		children: mockSnippet
	};

	it('should render the children', () => {
		const { getByTestId } = render(ConvertContexts, { props: defaultProps });

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
	});

	it('should initialize the convert context', () => {
		render(ConvertContexts, { props: defaultProps });

		expect(setContext).toHaveBeenCalledWith(
			CONVERT_CONTEXT_KEY,
			expect.objectContaining({
				sourceToken: expect.any(Object),
				destinationToken: expect.any(Object),
				sourceTokenBalance: expect.any(Object),
				destinationTokenBalance: expect.any(Object),
				sourceTokenExchangeRate: expect.any(Object),
				destinationTokenExchangeRate: expect.any(Object),
				balanceForFee: expect.any(Object),
				minterInfo: expect.any(Object)
			})
		);
	});

	it('should initialize the token action validation errors context', () => {
		render(ConvertContexts, { props: defaultProps });

		expect(setContext).toHaveBeenCalledWith(
			TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
			expect.objectContaining({
				insufficientFunds: expect.any(Object),
				insufficientFundsForFee: expect.any(Object)
			})
		);
	});

	describe('onDestroy', () => {
		it('should reset UTXOs data stores on unmount when sourceToken is Bitcoin', () => {
			const { unmount } = render(ConvertContexts, {
				props: {
					...defaultProps,
					sourceToken: BTC_MAINNET_TOKEN
				}
			});

			expect(btcUtxosUtils.resetUtxosDataStores).not.toHaveBeenCalled();

			unmount();

			expect(btcUtxosUtils.resetUtxosDataStores).toHaveBeenCalledOnce();
		});

		it('should not reset UTXOs data stores on unmount when sourceToken is not Bitcoin', () => {
			const { unmount } = render(ConvertContexts, { props: defaultProps });

			unmount();

			expect(btcUtxosUtils.resetUtxosDataStores).not.toHaveBeenCalled();
		});
	});
});
