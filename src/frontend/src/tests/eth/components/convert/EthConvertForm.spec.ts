import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import EthConvertForm from '$eth/components/convert/EthConvertForm.svelte';
import {
	FEE_CONTEXT_KEY,
	initFeeContext,
	initFeeStore,
	type FeeContext,
	type FeeStore
} from '$eth/stores/fee.store';
import * as ckEthDerived from '$icp-eth/derived/cketh.derived';
import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext
} from '$lib/stores/convert.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { readable, writable } from 'svelte/store';

describe('EthConvertForm', () => {
	let store: FeeStore;
	const mockContext = ({ feeStore }: { feeStore: FeeStore }) =>
		new Map<symbol, ConvertContext | FeeContext>([
			[
				FEE_CONTEXT_KEY,
				initFeeContext({
					feeStore,
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id)
				})
			],
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({
					sourceToken: ETHEREUM_TOKEN,
					destinationToken: ICP_TOKEN
				})
			]
		]);

	const mockCkEthStore = (address?: string) =>
		vi
			.spyOn(ckEthDerived, 'ckEthHelperContractAddress', 'get')
			.mockImplementation(() => readable(address));

	const props = {
		sendAmount: 0.001,
		receiveAmount: 0.001
	};
	const mockFeeStore = {
		maxFeePerGas: BigNumber.from(1000n),
		gas: BigNumber.from(1000n),
		maxPriorityFeePerGas: BigNumber.from(1000n),
		maxGasFee: BigNumber.from(1000n)
	};

	const buttonTestId = 'convert-form-button-next';

	beforeEach(() => {
		mockPage.reset();
		vi.resetAllMocks();
		store = initFeeStore();
	});

	it('should keep the next button clickable if all requirements are met', () => {
		store.setFee(mockFeeStore);
		mockCkEthStore('address');

		const { getByTestId } = render(EthConvertForm, {
			props,
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is undefined', () => {
		store.setFee(mockFeeStore);
		mockCkEthStore('address');

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
		mockCkEthStore('address');

		const { getByTestId } = render(EthConvertForm, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if ckEthHelperContractAddress is not available', () => {
		store.setFee(mockFeeStore);
		mockCkEthStore(undefined);

		const { getByTestId } = render(EthConvertForm, {
			props,
			context: mockContext({ feeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});
});
