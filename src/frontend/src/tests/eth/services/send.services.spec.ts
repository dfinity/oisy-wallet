import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import * as approveServices from '$eth/services/approve.services';
import * as ethTransactionServices from '$eth/services/eth-transaction.services';
import * as prepareServices from '$eth/services/prepare.services';
import { erc20PrepareTransaction, ethPrepareTransaction, send } from '$eth/services/send.services';
import * as signerApi from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const { mockSendTransaction } = vi.hoisted(() => ({
	mockSendTransaction: vi.fn()
}));

vi.mock('$eth/services/approve.services');
vi.mock('$eth/services/eth-transaction.services');
vi.mock('$eth/services/prepare.services');
vi.mock('$lib/api/signer.api');

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn(() => ({
		sendTransaction: mockSendTransaction
	}))
}));

vi.mock('$eth/providers/infura-cketh.providers', () => ({
	infuraCkETHProviders: vi.fn(() => ({
		populateTransaction: vi.fn().mockResolvedValue({ data: '0xdata' })
	}))
}));

vi.mock('$eth/providers/infura-erc20.providers', () => ({
	infuraErc20Providers: vi.fn(() => ({
		populateTransaction: vi.fn().mockResolvedValue({ data: '0xerc20data' })
	}))
}));

vi.mock('$eth/providers/infura-erc20-icp.providers', () => ({
	infuraErc20IcpProviders: vi.fn(() => ({
		populateTransaction: vi.fn().mockResolvedValue({ data: '0xerc20icpdata' })
	}))
}));

vi.mock('$eth/providers/infura-ckerc20.providers', () => ({
	infuraCkErc20Providers: vi.fn(() => ({
		populateTransaction: vi.fn().mockResolvedValue({ data: '0xckerc20data' })
	}))
}));

describe('send.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('ethPrepareTransaction', () => {
		it('should create transaction request with all fields', () => {
			const result = ethPrepareTransaction({
				from: '0xSender',
				to: '0xRecipient',
				amount: 1_000_000n,
				maxPriorityFeePerGas: 100n,
				maxFeePerGas: 200n,
				nonce: 5,
				gas: 21_000n,
				data: '0xsomedata',
				chainId: 1n
			});

			expect(result).toEqual({
				to: '0xRecipient',
				value: 1_000_000n,
				chain_id: 1n,
				nonce: 5n,
				gas: 21_000n,
				max_fee_per_gas: 200n,
				max_priority_fee_per_gas: 100n,
				data: toNullable('0xsomedata')
			});
		});

		it('should use ETH_BASE_FEE when gas is undefined', () => {
			const result = ethPrepareTransaction({
				from: '0xSender',
				to: '0xRecipient',
				amount: 1_000_000n,
				maxPriorityFeePerGas: 100n,
				maxFeePerGas: 200n,
				nonce: 0,
				gas: undefined,
				data: undefined,
				chainId: 1n
			});

			expect(result.gas).toBe(ETH_BASE_FEE);
			expect(result.data).toEqual(toNullable(undefined));
		});

		it('should convert nonce to bigint', () => {
			const result = ethPrepareTransaction({
				from: '0xSender',
				to: '0xRecipient',
				amount: ZERO,
				maxPriorityFeePerGas: ZERO,
				maxFeePerGas: ZERO,
				nonce: 42,
				gas: 21_000n,
				data: undefined,
				chainId: 1n
			});

			expect(result.nonce).toBe(42n);
		});
	});

	describe('erc20PrepareTransaction', () => {
		it('should prepare ERC20 transaction with populated data', async () => {
			const mockPopulate = vi.fn().mockResolvedValue({ data: '0xpopulateddata' });

			vi.mocked(prepareServices.prepare).mockReturnValue({
				to: mockValidErc20Token.address,
				value: ZERO,
				chain_id: 1n,
				nonce: ZERO,
				gas: 60_000n,
				max_fee_per_gas: 200n,
				max_priority_fee_per_gas: 100n,
				data: toNullable('0xpopulateddata')
			});

			await erc20PrepareTransaction({
				from: '0xSender',
				to: '0xRecipient',
				amount: 1_000_000n,
				maxPriorityFeePerGas: 100n,
				maxFeePerGas: 200n,
				nonce: 0,
				gas: 60_000n,
				chainId: 1n,
				token: mockValidErc20Token,
				populate: mockPopulate
			});

			expect(mockPopulate).toHaveBeenCalledWith({
				contract: mockValidErc20Token,
				to: '0xRecipient',
				amount: 1_000_000n
			});

			expect(prepareServices.prepare).toHaveBeenCalledWith(
				expect.objectContaining({
					data: '0xpopulateddata',
					to: mockValidErc20Token.address,
					amount: ZERO
				})
			);
		});

		it('should throw when data is undefined', async () => {
			const mockPopulate = vi.fn().mockResolvedValue({ data: undefined });

			await expect(
				erc20PrepareTransaction({
					from: '0xSender',
					to: '0xRecipient',
					amount: 1_000_000n,
					maxPriorityFeePerGas: 100n,
					maxFeePerGas: 200n,
					nonce: 0,
					gas: 60_000n,
					chainId: 1n,
					token: mockValidErc20Token,
					populate: mockPopulate
				})
			).rejects.toThrow(get(i18n).send.error.erc20_data_undefined);
		});
	});

	describe('send', () => {
		const mockProgress = vi.fn();

		beforeEach(() => {
			mockSendTransaction.mockResolvedValue({ hash: '0xhash123' });
			vi.mocked(signerApi.signTransaction).mockResolvedValue('0xsignedtx');
			vi.mocked(ethTransactionServices.processTransactionSent).mockResolvedValue(undefined);
		});

		it('should execute the full send flow', async () => {
			vi.mocked(approveServices.approve).mockResolvedValue({
				transactionNeededApproval: false,
				nonce: 5
			});

			const result = await send({
				progress: mockProgress,
				token: mockValidErc20Token,
				identity: mockIdentity,
				to: '0xRecipient',
				amount: 1_000_000n,
				from: '0xSender',
				sourceNetwork: ETHEREUM_NETWORK,
				targetNetwork: ETHEREUM_NETWORK,
				maxFeePerGas: 200n,
				maxPriorityFeePerGas: 100n,
				gas: 21_000n,
				minterInfo: undefined,
				lastProgressStep: ProgressStepsSend.DONE
			});

			expect(result).toEqual({ hash: expect.any(String) });
			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSend.INITIALIZATION);
			expect(approveServices.approve).toHaveBeenCalledOnce();
		});

		it('should increment nonce when approval was needed', async () => {
			vi.mocked(approveServices.approve).mockResolvedValue({
				transactionNeededApproval: true,
				nonce: 5
			});

			await send({
				progress: mockProgress,
				token: mockValidErc20Token,
				identity: mockIdentity,
				to: '0xRecipient',
				amount: 1_000_000n,
				from: '0xSender',
				sourceNetwork: ETHEREUM_NETWORK,
				targetNetwork: ETHEREUM_NETWORK,
				maxFeePerGas: 200n,
				maxPriorityFeePerGas: 100n,
				gas: 21_000n,
				minterInfo: undefined,
				lastProgressStep: ProgressStepsSend.DONE
			});

			expect(approveServices.approve).toHaveBeenCalledOnce();
		});

		it('should call processTransactionSent fire-and-forget', async () => {
			vi.mocked(approveServices.approve).mockResolvedValue({
				transactionNeededApproval: false,
				nonce: 0
			});

			await send({
				progress: mockProgress,
				token: mockValidErc20Token,
				identity: mockIdentity,
				to: '0xRecipient',
				amount: 1_000_000n,
				from: '0xSender',
				sourceNetwork: ETHEREUM_NETWORK,
				targetNetwork: ETHEREUM_NETWORK,
				maxFeePerGas: 200n,
				maxPriorityFeePerGas: 100n,
				gas: 21_000n,
				minterInfo: undefined,
				lastProgressStep: ProgressStepsSend.DONE
			});

			expect(ethTransactionServices.processTransactionSent).toHaveBeenCalledOnce();
		});

		it('should call progress with the last step', async () => {
			vi.mocked(approveServices.approve).mockResolvedValue({
				transactionNeededApproval: false,
				nonce: 0
			});

			await send({
				progress: mockProgress,
				token: mockValidErc20Token,
				identity: mockIdentity,
				to: '0xRecipient',
				amount: 1_000_000n,
				from: '0xSender',
				sourceNetwork: ETHEREUM_NETWORK,
				targetNetwork: ETHEREUM_NETWORK,
				maxFeePerGas: 200n,
				maxPriorityFeePerGas: 100n,
				gas: 21_000n,
				minterInfo: undefined,
				lastProgressStep: ProgressStepsSend.DONE
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsSend.DONE);
		});
	});
});
