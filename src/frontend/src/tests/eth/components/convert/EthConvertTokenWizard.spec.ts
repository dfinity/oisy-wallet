import { ICP_NETWORK } from '$env/networks/networks.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
import * as tokensDerived from '$eth/derived/token.derived';
import * as sendServices from '$eth/services/send.services';
import type { FeeStoreData } from '$eth/stores/fee.store';
import * as feeStores from '$eth/stores/fee.store';
import * as ckEthDerived from '$icp-eth/derived/cketh.derived';
import * as ckEthStores from '$icp-eth/stores/cketh.store';
import { type CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { ethAddressStore } from '$lib/stores/address.store';
import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { stringifyJson } from '$lib/utils/json.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { MinterInfo } from '@dfinity/cketh';
import { assertNonNullish, nonNullish, toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { get, readable, writable } from 'svelte/store';
import { expect, type MockInstance } from 'vitest';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$eth/services/fee.services', () => ({
	getErc20FeeData: vi.fn()
}));

vi.mock('@ethersproject/providers', () => {
	const provider = vi.fn();
	provider.prototype.getFeeData = vi.fn().mockResolvedValue({
		lastBaseFeePerGas: null,
		maxFeePerGas: null,
		maxPriorityFeePerGas: null,
		gasPrice: null
	});
	return { InfuraProvider: provider, JsonRpcProvider: provider };
});

describe('EthConvertTokenWizard', () => {
	const sendAmount = 0.001;
	const transactionId = 'txid';
	const mockContext = () =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(ETHEREUM_TOKEN),
					destinationToken: readable(SEPOLIA_TOKEN)
				}
			]
		]);
	const mockMinterInfo = {
		deposit_with_subaccount_helper_contract_address: toNullable(''),
		eth_balance: toNullable(100n),
		eth_helper_contract_address: toNullable(''),
		last_observed_block_number: toNullable(100n),
		evm_rpc_id: toNullable(mockPrincipal),
		erc20_helper_contract_address: toNullable(''),
		last_erc20_scraped_block_number: toNullable(100n),
		supported_ckerc20_tokens: toNullable([]),
		last_gas_fee_estimate: toNullable({
			max_priority_fee_per_gas: 100n,
			max_fee_per_gas: 100n,
			timestamp: 100n
		}),
		cketh_ledger_id: toNullable(mockPrincipal),
		smart_contract_address: toNullable(''),
		last_eth_scraped_block_number: toNullable(100n),
		minimum_withdrawal_amount: toNullable(100n),
		erc20_balances: toNullable([]),
		minter_address: toNullable(''),
		last_deposit_with_subaccount_scraped_block_number: toNullable(100n),
		ethereum_block_height: toNullable({ Safe: null })
	};
	const mockFees = {
		gas: BigNumber.from(100n),
		maxFeePerGas: BigNumber.from(100n),
		maxPriorityFeePerGas: BigNumber.from(100n)
	};
	const props = {
		currentStep: {
			name: WizardStepsConvert.REVIEW,
			title: 'title'
		},
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		sendAmount: sendAmount,
		receiveAmount: sendAmount
	};
	let sendSpy: MockInstance;
	const mockSendServices = () =>
		vi.spyOn(sendServices, 'send').mockResolvedValue({ hash: transactionId });
	const mockCkEthMinterInfoStore = (minterInfo?: MinterInfo) => {
		const store = initCertifiedSetterStore<CkEthMinterInfoData>();

		if (nonNullish(minterInfo)) {
			store.set({
				tokenId: ETHEREUM_TOKEN.id,
				data: {
					certified: true,
					data: minterInfo
				}
			});
		}

		vi.spyOn(ckEthStores, 'ckEthMinterInfoStore', 'get').mockImplementation(() => store);
		return store;
	};
	const mockEthAddressStore = (address = mockEthAddress) => {
		ethAddressStore.set({
			certified: true,
			data: address
		});
	};
	const mockFeeStore = (fees?: FeeStoreData) => {
		const store = writable<FeeStoreData>(undefined);
		store.set(fees);

		vi.spyOn(feeStores, 'initFeeStore').mockImplementation(() => ({
			...store,
			setFee: store.set
		}));
		return store;
	};
	const mockCkEthHelperContractAddress = (address = mockEthAddress) =>
		vi
			.spyOn(ckEthDerived, 'ckEthHelperContractAddress', 'get')
			.mockImplementation(() => readable(address));
	const mockEthereumToken = (token = ETHEREUM_TOKEN) =>
		vi.spyOn(tokensDerived, 'ethereumToken', 'get').mockImplementation(() => readable(token));
	const clickConvertButton = async (container: HTMLElement) => {
		const convertButtonSelector = '[data-tid="convert-review-button-next"]';
		const button: HTMLButtonElement | null = container.querySelector(convertButtonSelector);
		assertNonNullish(button, 'Button not found');
		await fireEvent.click(button);
	};

	beforeEach(() => {
		mockPage.reset();
		vi.resetAllMocks();
		ethAddressStore.reset();

		mockEthereumToken();
		sendSpy = mockSendServices();
	});

	it('should call send if all requirements are met', async () => {
		const ckEthMinterInfoStore = mockCkEthMinterInfoStore(mockMinterInfo);
		mockAuthStore();
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		const feeStore = mockFeeStore(mockFees);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		const args = sendSpy.mock.calls[0][0];

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
					maxFeePerGas: get(feeStore)?.maxFeePerGas,
					maxPriorityFeePerGas: get(feeStore)?.maxPriorityFeePerGas,
					gas: get(feeStore)?.gas,
					sourceNetwork: DEFAULT_ETHEREUM_NETWORK,
					targetNetwork: ICP_NETWORK,
					identity: mockIdentity,
					minterInfo: get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN.id]
				}
			})
		);
	});

	it('should not call send if authIdentity is not defined', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockFeeStore(mockFees);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if sendAmount is not defined', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockEthereumToken();
		mockAuthStore();
		mockFeeStore(mockFees);

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
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockAuthStore();
		mockFeeStore(mockFees);

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
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockAuthStore();
		mockFeeStore(undefined);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if minter info assertion failed', async () => {
		mockCkEthMinterInfoStore(undefined);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockAuthStore();
		mockFeeStore(mockFees);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if maxFeePerGas is null', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockEthereumToken();
		mockAuthStore();
		mockFeeStore({ ...mockFees, maxFeePerGas: null });

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if maxFeePerGas is null', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockCkEthHelperContractAddress();
		mockAuthStore();
		mockFeeStore({ ...mockFees, maxPriorityFeePerGas: null });

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if ethAddress is not defined', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockCkEthHelperContractAddress();
		mockAuthStore();
		mockFeeStore(mockFees);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should not call send if ckEthHelperContractAddress is not defined', async () => {
		mockCkEthMinterInfoStore(mockMinterInfo);
		mockEthAddressStore();
		mockAuthStore();
		mockFeeStore(mockFees);

		const { container } = render(EthConvertTokenWizard, {
			props,
			context: mockContext()
		});

		await clickConvertButton(container);

		expect(sendSpy).not.toHaveBeenCalled();
	});

	it('should render convert form if currentStep is CONVERT', () => {
		mockFeeStore(mockFees);

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
		mockFeeStore(mockFees);

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
