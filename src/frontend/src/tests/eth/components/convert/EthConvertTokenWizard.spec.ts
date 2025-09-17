import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
import * as tokensDerived from '$eth/derived/token.derived';
import * as sendServices from '$eth/services/send.services';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeContext,
	type FeeStoreData
} from '$eth/stores/eth-fee.store';
import * as ckEthDerived from '$icp-eth/derived/cketh.derived';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import * as ckEthStores from '$icp-eth/stores/cketh.store';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { ethAddressStore } from '$lib/stores/address.store';
import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
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
import type { OptionEthAddress } from '$lib/types/address';
import { stringifyJson } from '$lib/utils/json.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { MinterInfo } from '@dfinity/cketh';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { InfuraProvider } from 'ethers/providers';
import { get, readable, writable } from 'svelte/store';
import type { MockInstance } from 'vitest';
import { mockSnippet } from '$tests/mocks/snippet.mock';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$eth/services/fee.services', () => ({
	getErc20FeeData: vi.fn()
}));

describe('EthConvertTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const mockContext = (fees?: FeeStoreData) => {
		const feeStore = initEthFeeStore();

		if (nonNullish(fees)) {
			feeStore.setFee(fees);
		}

		return new Map<symbol, ConvertContext | TokenActionValidationErrorsContext | EthFeeContext>([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({ sourceToken: ETHEREUM_TOKEN, destinationToken: SEPOLIA_TOKEN })
			],
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeExchangeRateStore: writable(100),
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);
	};
	const mockMinterInfo = mockCkMinterInfo;
	const mockFees = {
		gas: 100n,
		maxFeePerGas: 100n,
		maxPriorityFeePerGas: 100n
	};
	const onBack=vi.fn()
	const onClose=vi.fn()
	const onNext=vi.fn()
	const props = {
		currentStep: {
			name: WizardStepsConvert.REVIEW,
			title: 'title'
		},
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		sendAmount,
		receiveAmount: sendAmount,
		onBack,
		onClose,
		onNext,
	};

	let sendSpy: MockInstance;

	const mockCkEthMinterInfoStore = (minterInfo?: MinterInfo) => {
		const store = initCertifiedSetterStore<CkEthMinterInfoData>();

		if (nonNullish(minterInfo)) {
			store.set({
				id: ETHEREUM_TOKEN.id,
				data: {
					certified: true,
					data: minterInfo
				}
			});
		}

		vi.spyOn(ckEthStores, 'ckEthMinterInfoStore', 'get').mockImplementation(() => store);
		return store;
	};

	const mockEthAddressStore = (address: OptionEthAddress = mockEthAddress) => {
		if (isNullish(address)) {
			ethAddressStore.reset();
			return;
		}

		ethAddressStore.set({
			certified: true,
			data: address
		});
	};

	const mockCkEthHelperContractAddress = (address: OptionEthAddress = mockEthAddress) =>
		vi
			.spyOn(ckEthDerived, 'ckEthHelperContractAddress', 'get')
			.mockImplementation(() => readable(address));

	const mockEthereumToken = (token = ETHEREUM_TOKEN) =>
		vi.spyOn(tokensDerived, 'nativeEthereumToken', 'get').mockImplementation(() => readable(token));

	const clickConvertButton = async (container: HTMLElement) => {
		const convertButtonSelector = '[data-tid="convert-review-button-next"]';
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		InfuraProvider.prototype.getFeeData = vi.fn().mockResolvedValue({
			lastBaseFeePerGas: null,
			maxFeePerGas: null,
			maxPriorityFeePerGas: null,
			gasPrice: null
		});

		mockPage.reset();
		mockPage.mock({ network: ETHEREUM_NETWORK_ID.description });

		ethAddressStore.reset();

		mockAuthStore();
		mockEthereumToken();
		mockEthAddressStore();
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockCkEthHelperContractAddress();

		sendSpy = vi.spyOn(sendServices, 'send').mockResolvedValue({ hash: transactionId });
	});

	it('should call send if all requirements are met', async () => {
		const ckEthMinterInfoStore = mockCkEthMinterInfoStore(mockMinterInfo);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext(mockFees)
		});

		await clickConvertButton(container);

		const [[args]] = sendSpy.mock.calls;

		expect(sendSpy).toHaveBeenCalledOnce();
		expect(stringifyJson({ value: args })).toBe(
			stringifyJson({
				value: {
					from: mockEthAddress,
					to: mockEthAddress,
					progress: () => {},
					token: ETHEREUM_TOKEN,
					amount: parseToken({
						value: `${sendAmount}`,
						unitName: ETHEREUM_TOKEN.decimals
					}),
					maxFeePerGas: mockFees.maxFeePerGas,
					maxPriorityFeePerGas: mockFees.maxPriorityFeePerGas,
					gas: mockFees.gas,
					sourceNetwork: DEFAULT_ETHEREUM_NETWORK,
					targetNetwork: ICP_NETWORK,
					identity: mockIdentity,
					minterInfo: get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN.id]
				}
			})
		);
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockAuthStore(null);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is not defined', async () => {
		const { container } = render(EthConvertTokenWizard, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is invalid', async () => {
		const { container } = render(EthConvertTokenWizard, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if feeStore is undefined', async () => {
		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if minter info assertion failed', async () => {
		mockCkEthMinterInfoStore(undefined);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if maxFeePerGas is null', async () => {
		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext({ ...mockFees, maxFeePerGas: null })
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if maxPriorityFeePerGas is null', async () => {
		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext({ ...mockFees, maxPriorityFeePerGas: null })
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if ethAddress is not defined', async () => {
		mockEthAddressStore(null);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if ckEthHelperContractAddress is not defined', async () => {
		mockCkEthHelperContractAddress(null);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should render convert form if currentStep is CONVERT', () => {
		const { getByTestId } = render(EthConvertTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsConvert.CONVERT,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId('convert-form-button-next')).toBeInTheDocument();
	});

	it('should render convert progress if currentStep is CONVERTING', () => {
		const { container } = render(EthConvertTokenWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsConvert.CONVERTING,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});
});
