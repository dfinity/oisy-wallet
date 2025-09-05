import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import EthConvertForm from '$eth/components/convert/EthConvertForm.svelte';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeContext,
	type EthFeeStore
} from '$eth/stores/eth-fee.store';
import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext
} from '$lib/stores/convert.store';
import {
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
	initTokenActionValidationErrorsContext,
	type TokenActionValidationErrorsContext
} from '$lib/stores/token-action-validation-errors.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthConvertForm', () => {
	let store: EthFeeStore;
	const mockContext = ({ feeStore }: { feeStore: EthFeeStore }) =>
		new Map<symbol, ConvertContext | EthFeeContext | TokenActionValidationErrorsContext>([
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(100)
				})
			],
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({
					sourceToken: ETHEREUM_TOKEN,
					destinationToken: ICP_TOKEN
				})
			],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);

	const props = {
		sendAmount: 0.001,
		receiveAmount: 0.001,
		destination: 'address'
	};
	const mockFeeStore = {
		maxFeePerGas: 1000n,
		gas: 1000n,
		maxPriorityFeePerGas: 1000n,
		maxGasFee: 1000n
	};

	const buttonTestId = 'convert-form-button-next';

	beforeEach(() => {
		mockPage.reset();
		vi.resetAllMocks();
		store = initEthFeeStore();
	});

	it('should keep the next button clickable if all requirements are met', () => {
		store.setFee(mockFeeStore);

		const { getByTestId } = render(EthConvertForm, {
			props,
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is undefined', () => {
		store.setFee(mockFeeStore);

		const { getByTestId } = render(EthConvertForm, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is invalid', () => {
		store.setFee(mockFeeStore);

		const { getByTestId } = render(EthConvertForm, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if destination is not provided', () => {
		store.setFee(mockFeeStore);

		const { getByTestId } = render(EthConvertForm, {
			props: {
				...props,
				destination: undefined
			},
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});
});
