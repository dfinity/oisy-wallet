import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ARB_TOKEN } from '$env/tokens/tokens-erc20/tokens.arb.env';
import { DMAIL_TOKEN } from '$env/tokens/tokens-erc20/tokens.dmail.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdt.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraErc20Providers from '$eth/providers/infura-erc20.providers';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProviders from '$eth/providers/infura.providers';
import { approve, erc20ContractAllowance } from '$eth/services/approve.services';
import type { ApproveParams } from '$eth/types/send';
import * as signerApiLib from '$lib/api/signer.api';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { bn1Bi, bn3Bi } from '$tests/mocks/balances.mock';
import { mockCkMinterInfo, mockErc20HelperContractAddress } from '$tests/mocks/ck-minter.mock';
import { mockEthTransaction } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

describe('approve.services', () => {
	describe('erc20ContractAllowance', () => {
		const mockParams = {
			token: USDC_TOKEN,
			owner: mockEthAddress,
			spender: mockEthAddress2,
			networkId: USDC_TOKEN.network.id
		};

		const mockAllowance = 123n;

		const allowanceSpy = vi.fn();

		const mockErc20Provider = { allowance: allowanceSpy } as unknown as InfuraErc20Provider;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(infuraErc20Providers, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);

			allowanceSpy.mockResolvedValue(mockAllowance);
		});

		it('should return the allowance', async () => {
			await expect(erc20ContractAllowance(mockParams)).resolves.toBe(mockAllowance);

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: USDC_TOKEN,
				owner: mockParams.owner,
				spender: mockParams.spender
			});
		});

		it('should fail when the service fails', async () => {
			const mockError = new Error('Mock Error');
			allowanceSpy.mockRejectedValueOnce(mockError);

			await expect(erc20ContractAllowance(mockParams)).rejects.toThrow(mockError);

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: USDC_TOKEN,
				owner: mockParams.owner,
				spender: mockParams.spender
			});
		});
	});

	describe('approve', () => {
		const mockProgress = vi.fn();

		const mockParams: ApproveParams = {
			token: USDC_TOKEN,
			from: mockEthAddress,
			to: mockErc20HelperContractAddress,
			minterInfo: { data: mockCkMinterInfo, certified: false },
			amount: bn3Bi,
			sourceNetwork: ETHEREUM_NETWORK,
			progress: mockProgress,
			progressSteps: ProgressStepsSend,
			data: 'mock-data',
			identity: mockIdentity,
			maxPriorityFeePerGas: 123n,
			maxFeePerGas: 456n,
			gas: 789n
		};

		const mockRawTransaction1 = '0xabcdef1234567890';
		const mockRawTransaction2 = '0xabcdef1234567891';
		const mockHash = mockEthTransaction.hash;

		const getTransactionCountSpy = vi.fn();
		const sendTransactionSpy = vi.fn();
		const allowanceSpy = vi.fn();
		const populateApproveSpy = vi.fn();

		const mockProvider = {
			getTransactionCount: getTransactionCountSpy,
			sendTransaction: sendTransactionSpy
		} as unknown as InfuraProvider;
		const mockErc20Provider = {
			allowance: allowanceSpy,
			populateApprove: populateApproveSpy
		} as unknown as InfuraErc20Provider;

		const initialNonce = 7;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(infuraProviders, 'infuraProviders').mockReturnValue(mockProvider);
			vi.spyOn(infuraErc20Providers, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);

			getTransactionCountSpy.mockResolvedValue(initialNonce);
			sendTransactionSpy.mockResolvedValue({ hash: mockHash });
			populateApproveSpy.mockResolvedValue({ data: 'mock-approve-data' });

			vi.spyOn(signerApiLib, 'signTransaction')
				.mockReset()
				.mockResolvedValueOnce(mockRawTransaction1)
				.mockResolvedValueOnce(mockRawTransaction2);
		});

		it('should fail if service getTransactionCount fails', async () => {
			const mockError = new Error('Transaction count error');
			getTransactionCountSpy.mockRejectedValueOnce(mockError);

			await expect(approve(mockParams)).rejects.toThrow(mockError);

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});
		});

		it('should return early if it should not swap with approval', async () => {
			const result = await approve({ ...mockParams, shouldSwapWithApproval: false });

			expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).not.toHaveBeenCalled();
		});

		it('should return early if minter info is nullish', async () => {
			const result = await approve({ ...mockParams, minterInfo: undefined });

			expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).not.toHaveBeenCalled();
		});

		it('should return early if the ERC20 helper contract is nullish', async () => {
			const result = await approve({
				...mockParams,
				minterInfo: {
					data: {
						...mockCkMinterInfo,
						erc20_helper_contract_address: toNullable()
					},
					certified: false
				}
			});

			expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).not.toHaveBeenCalled();
		});

		it.each([BONK_TOKEN, ETHEREUM_TOKEN, USDT_TOKEN, ARB_TOKEN, DMAIL_TOKEN])(
			'should return early if token is not an ERC20 twin token, for example $symbol ($network.name)',
			async (token) => {
				const result = await approve({ ...mockParams, token });

				expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

				expect(allowanceSpy).not.toHaveBeenCalled();
			}
		);

		it('should return early if destination is the helper contract', async () => {
			const result = await approve({ ...mockParams, to: mockEthAddress2 });

			expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).not.toHaveBeenCalled();
		});

		it('should return early if the allowance is already greater than or equal to the amount', async () => {
			allowanceSpy.mockResolvedValueOnce(bn3Bi);

			const result = await approve(mockParams);

			expect(result).toStrictEqual({ transactionNeededApproval: false, nonce: initialNonce });

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				owner: mockParams.from,
				spender: mockParams.to
			});

			expect(populateApproveSpy).not.toHaveBeenCalled();

			expect(sendTransactionSpy).not.toHaveBeenCalled();

			expect(signTransaction).not.toHaveBeenCalled();

			expect(mockProgress).toHaveBeenCalledExactlyOnceWith(ProgressStepsSend.APPROVE);
		});

		it('should return truthfully and with the hash if the approval was needed', async () => {
			allowanceSpy.mockResolvedValueOnce(ZERO);

			const result = await approve(mockParams);

			expect(result).toStrictEqual({
				transactionNeededApproval: true,
				hash: mockHash,
				nonce: initialNonce
			});

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				owner: mockParams.from,
				spender: mockParams.to
			});

			expect(populateApproveSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				spender: mockParams.to,
				amount: mockParams.amount
			});

			expect(sendTransactionSpy).toHaveBeenCalledExactlyOnceWith(mockRawTransaction1);

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				transaction: {
					chain_id: mockParams.sourceNetwork.chainId,
					data: toNullable(mockParams.data),
					gas: mockParams.gas,
					max_fee_per_gas: mockParams.maxFeePerGas,
					max_priority_fee_per_gas: mockParams.maxPriorityFeePerGas,
					nonce: BigInt(initialNonce),
					to: USDC_TOKEN.address,
					value: ZERO
				}
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSend.SIGN_APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSend.APPROVE);
		});

		it('should reset the existing approval if not enough', async () => {
			allowanceSpy.mockResolvedValueOnce(bn3Bi - bn1Bi);

			const result = await approve(mockParams);

			expect(result).toStrictEqual({
				transactionNeededApproval: true,
				hash: mockHash,
				nonce: initialNonce + 1
			});

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				owner: mockParams.from,
				spender: mockParams.to
			});

			expect(populateApproveSpy).toHaveBeenCalledTimes(2);
			expect(populateApproveSpy).toHaveBeenNthCalledWith(1, {
				contract: mockParams.token,
				spender: mockParams.to,
				amount: ZERO
			});
			expect(populateApproveSpy).toHaveBeenNthCalledWith(2, {
				contract: mockParams.token,
				spender: mockParams.to,
				amount: mockParams.amount
			});

			expect(sendTransactionSpy).toHaveBeenCalledTimes(2);
			expect(sendTransactionSpy).toHaveBeenNthCalledWith(1, mockRawTransaction1);
			expect(sendTransactionSpy).toHaveBeenNthCalledWith(2, mockRawTransaction2);

			expect(signTransaction).toHaveBeenCalledTimes(2);
			expect(signTransaction).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				transaction: {
					chain_id: mockParams.sourceNetwork.chainId,
					data: toNullable(mockParams.data),
					gas: mockParams.gas,
					max_fee_per_gas: mockParams.maxFeePerGas,
					max_priority_fee_per_gas: mockParams.maxPriorityFeePerGas,
					nonce: BigInt(initialNonce),
					to: USDC_TOKEN.address,
					value: ZERO
				}
			});
			expect(signTransaction).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				transaction: {
					chain_id: mockParams.sourceNetwork.chainId,
					data: toNullable(mockParams.data),
					gas: mockParams.gas,
					max_fee_per_gas: mockParams.maxFeePerGas,
					max_priority_fee_per_gas: mockParams.maxPriorityFeePerGas,
					nonce: BigInt(initialNonce + 1),
					to: USDC_TOKEN.address,
					value: ZERO
				}
			});

			expect(mockProgress).toHaveBeenCalledTimes(4);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSend.SIGN_APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSend.APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsSend.SIGN_APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(4, ProgressStepsSend.APPROVE);
		});

		it('should use the destination address instead of the helper contract if it should swap with approval', async () => {
			allowanceSpy.mockResolvedValueOnce(ZERO);

			const result = await approve({
				...mockParams,
				shouldSwapWithApproval: true,
				to: mockEthAddress2
			});

			expect(result).toStrictEqual({
				transactionNeededApproval: true,
				hash: mockHash,
				nonce: initialNonce
			});

			expect(getTransactionCountSpy).toHaveBeenCalledExactlyOnceWith({
				address: mockEthAddress,
				tag: 'pending'
			});

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				owner: mockParams.from,
				spender: mockEthAddress2
			});

			expect(populateApproveSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				spender: mockEthAddress2,
				amount: mockParams.amount
			});

			expect(sendTransactionSpy).toHaveBeenCalledExactlyOnceWith(mockRawTransaction1);

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				transaction: {
					chain_id: mockParams.sourceNetwork.chainId,
					data: toNullable(mockParams.data),
					gas: mockParams.gas,
					max_fee_per_gas: mockParams.maxFeePerGas,
					max_priority_fee_per_gas: mockParams.maxPriorityFeePerGas,
					nonce: BigInt(initialNonce),
					to: USDC_TOKEN.address,
					value: ZERO
				}
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSend.SIGN_APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSend.APPROVE);
		});

		it('should accept a custom nonce', async () => {
			const mockNonce = initialNonce - 2;

			allowanceSpy.mockResolvedValueOnce(ZERO);

			const result = await approve({ ...mockParams, customNonce: mockNonce });

			expect(result).toStrictEqual({
				transactionNeededApproval: true,
				hash: mockHash,
				nonce: mockNonce
			});

			expect(getTransactionCountSpy).not.toHaveBeenCalled();

			expect(allowanceSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				owner: mockParams.from,
				spender: mockParams.to
			});

			expect(populateApproveSpy).toHaveBeenCalledExactlyOnceWith({
				contract: mockParams.token,
				spender: mockParams.to,
				amount: mockParams.amount
			});

			expect(sendTransactionSpy).toHaveBeenCalledExactlyOnceWith(mockRawTransaction1);

			expect(signTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				transaction: {
					chain_id: mockParams.sourceNetwork.chainId,
					data: toNullable(mockParams.data),
					gas: mockParams.gas,
					max_fee_per_gas: mockParams.maxFeePerGas,
					max_priority_fee_per_gas: mockParams.maxPriorityFeePerGas,
					nonce: BigInt(mockNonce),
					to: USDC_TOKEN.address,
					value: ZERO
				}
			});

			expect(mockProgress).toHaveBeenCalledTimes(2);
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSend.SIGN_APPROVE);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSend.APPROVE);
		});
	});
});
