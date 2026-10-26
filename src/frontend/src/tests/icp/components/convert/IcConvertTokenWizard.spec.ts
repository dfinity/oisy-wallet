import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { BTC_MAINNET_TOKEN, BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
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
import {
	SEND_FIRST_TIME_DESTINATION_CONFIRM,
	SEND_FIRST_TIME_DESTINATION_WARNING
} from '$lib/constants/test-ids.constants';
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
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

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

	const onBack = vi.fn();
	const onClose = vi.fn();
	const onNext = vi.fn();
	const onDestination = vi.fn();
	const onDestinationBack = vi.fn();
	const onQRCodeScan = vi.fn();
	const onQRCodeBack = vi.fn();

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
		onDestination,
		onDestinationBack,
		onQRCodeBack,
		onQRCodeScan
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

	const convertButtonSelector = '[data-tid="convert-review-button-next"]';

	const clickConvertButton = async (container: HTMLElement) => {
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();

		btcAddressMainnetStore.reset();
		ethAddressStore.reset();
		btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);

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

		const { container, getByTestId } = render(IcConvertTokenWizard, {
			props: {
				...props,
				customDestination
			},
			context: mockContext()
		});

		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));

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

	describe('custom destination', () => {
		const customDestination = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

		const customProps = { ...props, customDestination };

		const mockBtcTransaction = ({
			type,
			from,
			to
		}: {
			type: 'send' | 'receive';
			from: string;
			to: string;
		}) =>
			btcTransactionsStore.append({
				tokenId: BTC_MAINNET_TOKEN_ID,
				transactions: [
					{
						data: {
							id: 'tx1',
							timestamp: 1_700_000_000n,
							type,
							value: 100n,
							from,
							to: [to],
							status: 'confirmed'
						},
						certified: true
					}
				]
			});

		it('shows the whole custom destination on the review', () => {
			const { container } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			expect(container).toHaveTextContent(customDestination);
		});

		it('warns about a custom destination never sent to and keeps Convert disabled', () => {
			const { getByTestId } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
			expect(getByTestId('convert-review-button-next')).toBeDisabled();
		});

		it('converts once the first-time destination is confirmed', async () => {
			const { container, getByTestId } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));

			expect(getByTestId('convert-review-button-next')).toBeEnabled();

			await clickConvertButton(container);

			expect(sendSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ to: customDestination })
			);
		});

		it('asks again after going back from the review', async () => {
			const { getByTestId, rerender } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));

			await rerender({
				...customProps,
				currentStep: { name: WizardStepsConvert.CONVERT, title: 'title' }
			});
			await rerender(customProps);

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).not.toBeChecked();
			expect(getByTestId('convert-review-button-next')).toBeDisabled();
		});

		it('does not warn nor gate a custom destination already sent to on the twin network', () => {
			mockBtcTransaction({ type: 'send', from: mockBtcAddress, to: customDestination });

			const { queryByTestId, getByTestId } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
			expect(getByTestId('convert-review-button-next')).toBeEnabled();
		});

		it('still warns and gates when the address only ever sent to the wallet', () => {
			mockBtcTransaction({ type: 'receive', from: customDestination, to: mockBtcAddress });

			const { getByTestId } = render(IcConvertTokenWizard, {
				props: customProps,
				context: mockContext()
			});

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
			expect(getByTestId('convert-review-button-next')).toBeDisabled();
		});

		it('does not warn nor gate the default destination', () => {
			const { queryByTestId, getByTestId } = render(IcConvertTokenWizard, {
				props,
				context: mockContext()
			});

			expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
			expect(getByTestId('convert-review-button-next')).toBeEnabled();
		});

		it('warns and gates a custom Ethereum destination never sent to', () => {
			const ckEthToken = {
				...mockValidIcCkToken,
				symbol: ETHEREUM_TOKEN.twinTokenSymbol
			} as IcCkToken;

			const { container, getByTestId } = render(IcConvertTokenWizard, {
				props: { ...props, customDestination: mockEthAddress3 },
				context: new Map<
					symbol,
					| ConvertContext
					| BitcoinFeeContext
					| EthereumFeeContext
					| TokenActionValidationErrorsContext
				>([
					...mockContext(),
					[
						CONVERT_CONTEXT_KEY,
						initConvertContext({
							sourceToken: ckEthToken,
							destinationToken: ETHEREUM_TOKEN
						})
					]
				])
			});

			expect(container).toHaveTextContent(mockEthAddress3);
			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
			expect(getByTestId('convert-review-button-next')).toBeDisabled();
		});

		it('warns on the destination step about a custom destination never sent to', () => {
			const { getByTestId } = render(IcConvertTokenWizard, {
				props: {
					...customProps,
					currentStep: { name: WizardStepsConvert.DESTINATION, title: 'title' }
				},
				context: mockContext()
			});

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
		});

		it('does not warn on the destination step about a custom destination already sent to', () => {
			mockBtcTransaction({ type: 'send', from: mockBtcAddress, to: customDestination });

			const { queryByTestId } = render(IcConvertTokenWizard, {
				props: {
					...customProps,
					currentStep: { name: WizardStepsConvert.DESTINATION, title: 'title' }
				},
				context: mockContext()
			});

			expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).not.toBeInTheDocument();
		});
	});
});
