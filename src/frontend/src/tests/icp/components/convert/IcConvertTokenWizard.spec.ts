import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import IcConvertTokenWizard from '$icp/components/convert/IcConvertTokenWizard.svelte';
import * as sendServices from '$icp/services/ic-send.services';
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
import type { IcCkToken } from '$icp/types/ic-token';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { btcAddressMainnetStore, ethAddressStore } from '$lib/stores/address.store';
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
import { stringifyJson } from '$lib/utils/json.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';
import { mockSnippet } from '$tests/mocks/snippet.mock';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('IcConvertTokenWizard', () => {
	const sendAmount = 0.001;
	const ckBtcToken = {
		...mockValidIcCkToken,
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
	} as IcCkToken;

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
					sourceToken: ckBtcToken,
					destinationToken: BTC_MAINNET_TOKEN
				})
			],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);

	const onBack=vi.fn()
	const onClose=vi.fn()
	const onNext=vi.fn()
	const onDestination=vi.fn()
	const onDestinationBack=vi.fn()
	const onIcQrCodeScan=vi.fn()
	const onIcQrCodeBack=vi.fn()

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
		onDestination, onDestinationBack,
		onIcQrCodeBack,
		onIcQrCodeScan,
	};
	let sendSpy: MockInstance;

	const mockBtcAddressStore = (address = mockBtcAddress) => {
		btcAddressMainnetStore.set({
			certified: true,
			data: address
		});
	};

	const mockEthAddressStore = (address = mockEthAddress) => {
		ethAddressStore.set({
			certified: true,
			data: address
		});
	};

	const clickConvertButton = async (container: HTMLElement) => {
		const convertButtonSelector = '[data-tid="convert-review-button-next"]';
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		btcAddressMainnetStore.reset();
		ethAddressStore.reset();

		mockAuthStore();
		mockBtcAddressStore();
		mockEthAddressStore();

		sendSpy = vi.spyOn(sendServices, 'sendIc').mockResolvedValue(undefined);
	});

	it('should call send if all requirements are met', async () => {
		mockAuthStore();
		mockBtcAddressStore();
		mockEthAddressStore();

		const { container } = render(IcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		const [[args]] = sendSpy.mock.calls;

		expect(sendSpy).toHaveBeenCalledOnce();
		expect(stringifyJson({ value: args })).toBe(
			stringifyJson({
				value: {
					to: mockBtcAddress,
					amount: parseToken({
						value: `${sendAmount}`,
						unitName: ckBtcToken.decimals
					}),
					identity: mockIdentity,
					progress: () => {},
					ckErc20ToErc20MaxCkEthFees: undefined,
					token: ckBtcToken,
					targetNetworkId: BTC_MAINNET_TOKEN.network.id,
					sendCompleted: () => {}
				}
			})
		);
	});

	it('should call send with custom destination if it is set', async () => {
		const customDestination = 'customDestination';

		const { container } = render(IcConvertTokenWizard, {
			props: {
				...props,
				customDestination
			},
			context: mockContext()
		});

		await clickConvertButton(container);

		const [[args]] = sendSpy.mock.calls;

		expect(sendSpy).toHaveBeenCalledOnce();
		expect(stringifyJson({ value: args })).toBe(
			stringifyJson({
				value: {
					to: customDestination,
					amount: parseToken({
						value: `${sendAmount}`,
						unitName: ckBtcToken.decimals
					}),
					identity: mockIdentity,
					progress: () => {},
					ckErc20ToErc20MaxCkEthFees: undefined,
					token: ckBtcToken,
					targetNetworkId: BTC_MAINNET_TOKEN.network.id,
					sendCompleted: () => {}
				}
			})
		);
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockAuthStore(null);

		const { container } = render(IcConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is not defined', async () => {
		const { container } = render(IcConvertTokenWizard, {
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
		const { container } = render(IcConvertTokenWizard, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should render convert form if currentStep is CONVERT', () => {
		const { getByTestId } = render(IcConvertTokenWizard, {
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
		const { container } = render(IcConvertTokenWizard, {
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
