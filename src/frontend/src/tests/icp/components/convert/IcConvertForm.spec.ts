import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcConvertForm from '$icp/components/convert/IcConvertForm.svelte';
import {
	BITCOIN_FEE_CONTEXT_KEY,
	initBitcoinFeeStore,
	type BitcoinFeeContext
} from '$icp/stores/bitcoin-fee.store';
import {
	ETHEREUM_FEE_CONTEXT_KEY,
	initEthereumFeeStore,
	type EthereumFeeContext
} from '$icp/stores/ethereum-fee.store';
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
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('IcConvertForm', () => {
	const mockContext = () =>
		new Map<
			symbol,
			ConvertContext | BitcoinFeeContext | EthereumFeeContext | TokenActionValidationErrorsContext
		>([
			[ETHEREUM_FEE_CONTEXT_KEY, { store: initEthereumFeeStore() }],
			[BITCOIN_FEE_CONTEXT_KEY, { store: initBitcoinFeeStore() }],
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({
					sourceToken: mockValidIcCkToken,
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

	const buttonTestId = 'convert-form-button-next';

	beforeEach(() => {
		mockPage.reset();
		vi.resetAllMocks();
	});

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(IcConvertForm, {
			props,
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is undefined', () => {
		const { getByTestId } = render(IcConvertForm, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is invalid', () => {
		const { getByTestId } = render(IcConvertForm, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if destination is not provided', () => {
		const { getByTestId } = render(IcConvertForm, {
			props: {
				...props,
				destination: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});
});
