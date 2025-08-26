import { SUPPORTED_BITCOIN_NETWORK_IDS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORK_IDS } from '$env/networks/networks.eth.env';
import {
	CKERC20_LEDGER_CANISTER_IDS,
	IC_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import {
	icrc1Transfer as icrc1TransferIcp,
	transfer as transferIcp
} from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import { transfer as transferDip20 } from '$icp/api/xtc-ledger.api';
import {
	convertCkBTCToBtc,
	convertCkETHToEth,
	convertCkErc20ToErc20
} from '$icp/services/ck.services';
import { sendDip20, sendIc, sendIcp, sendIcrc } from '$icp/services/ic-send.services';
import type { IcTransferParams } from '$icp/types/ic-send';
import * as icrcAccountUtils from '$icp/utils/icrc-account.utils';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import * as accountUtils from '$lib/utils/account.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import en from '$tests/mocks/i18n.mock';
import {
	mockLedgerCanisterId,
	mockValidDip20Token,
	mockValidIcCkToken,
	mockValidIcToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipalText2 } from '$tests/mocks/identity.mock';
import { decodeIcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';

vi.mock('$lib/utils/wallet.utils', () => ({
	waitAndTriggerWallet: vi.fn()
}));

vi.mock('$icp/services/ck.services', () => ({
	convertCkBTCToBtc: vi.fn(),
	convertCkETHToEth: vi.fn(),
	convertCkErc20ToErc20: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	transfer: vi.fn()
}));

vi.mock('$icp/api/icp-ledger.api', () => ({
	icrc1Transfer: vi.fn(),
	transfer: vi.fn()
}));

vi.mock('$icp/api/xtc-ledger.api', () => ({
	transfer: vi.fn()
}));

describe('ic-send.services', () => {
	const mockProgress = vi.fn();
	const mockCkErc20ToErc20MaxCkEthFees = 123n;
	const mockAmount = 10_000_000n;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('sendIc', () => {
		const mockSendCompleted = vi.fn();

		const baseParams: IcTransferParams = {
			identity: mockIdentity,
			amount: mockAmount,
			to: mockPrincipalText2,
			progress: mockProgress,
			ckErc20ToErc20MaxCkEthFees: mockCkErc20ToErc20MaxCkEthFees
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe('when target network is not provided', () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			describe('when token is ICRC', () => {
				const mockParams = {
					...baseParams,
					token: mockValidIcrcToken,
					targetNetworkId: undefined,
					sendCompleted: mockSendCompleted
				};

				beforeEach(() => {
					vi.clearAllMocks();

					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValue(false);
				});

				it('should execute full send flow', async () => {
					await sendIc(mockParams);

					expect(transferIcrc).toHaveBeenCalledOnce();
					expect(transferIcrc).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						ledgerCanisterId: mockValidIcrcToken.ledgerCanisterId,
						to: decodeIcrcAccount(mockPrincipalText2),
						amount: mockAmount
					});
				});

				it('should call the auxiliary functions', async () => {
					await sendIc(mockParams);

					expect(mockSendCompleted).toHaveBeenCalledOnce();

					expect(mockProgress).toHaveBeenCalledTimes(2);
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);

					expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
				});

				it('should not call the other services', async () => {
					await sendIc(mockParams);

					expect(convertCkBTCToBtc).not.toHaveBeenCalled();
					expect(convertCkETHToEth).not.toHaveBeenCalled();
					expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
					expect(icrc1TransferIcp).not.toHaveBeenCalled();
					expect(transferIcp).not.toHaveBeenCalled();
					expect(transferDip20).not.toHaveBeenCalled();
				});

				it('should handle invalid destination addresses', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);

					await expect(sendIc(mockParams)).rejects.toThrow(en.send.error.invalid_destination);

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).not.toHaveBeenCalled();
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});

				it('should throw if the service throws', async () => {
					vi.mocked(transferIcrc).mockRejectedValueOnce(new Error('Test error'));

					await expect(sendIc(mockParams)).rejects.toThrow('Test error');

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).toHaveBeenCalledOnce();
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});
			});

			describe('when token is ICP', () => {
				const mockParams = {
					...baseParams,
					token: mockValidIcToken,
					targetNetworkId: undefined,
					sendCompleted: mockSendCompleted
				};

				beforeEach(() => {
					vi.clearAllMocks();
				});

				it('should execute full send flow if destination is a valid ICRC address', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

					await sendIc(mockParams);

					expect(icrc1TransferIcp).toHaveBeenCalledOnce();
					expect(icrc1TransferIcp).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						to: decodeIcrcAccount(mockPrincipalText2),
						amount: mockAmount,
						ledgerCanisterId: mockLedgerCanisterId
					});

					expect(transferIcp).not.toHaveBeenCalled();
				});

				it('should execute full send flow if destination is a valid ICP address', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

					await sendIc(mockParams);

					expect(transferIcp).toHaveBeenCalledOnce();
					expect(transferIcp).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						to: mockPrincipalText2,
						amount: mockAmount,
						ledgerCanisterId: mockLedgerCanisterId
					});

					expect(icrc1TransferIcp).not.toHaveBeenCalled();
				});

				it('should call the auxiliary functions', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

					await sendIc(mockParams);

					expect(mockSendCompleted).toHaveBeenCalledOnce();

					expect(mockProgress).toHaveBeenCalledTimes(2);
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);

					expect(waitAndTriggerWallet).toHaveBeenCalledOnce();

					vi.clearAllMocks();

					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

					await sendIc(mockParams);

					expect(mockSendCompleted).toHaveBeenCalledOnce();

					expect(mockProgress).toHaveBeenCalledTimes(2);
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);

					expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
				});

				it('should not call the other services', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

					await sendIc(mockParams);

					expect(convertCkBTCToBtc).not.toHaveBeenCalled();
					expect(convertCkETHToEth).not.toHaveBeenCalled();
					expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
					expect(transferIcrc).not.toHaveBeenCalled();
					expect(transferDip20).not.toHaveBeenCalled();

					vi.clearAllMocks();

					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

					await sendIc(mockParams);

					expect(convertCkBTCToBtc).not.toHaveBeenCalled();
					expect(convertCkETHToEth).not.toHaveBeenCalled();
					expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
					expect(transferIcrc).not.toHaveBeenCalled();
					expect(transferDip20).not.toHaveBeenCalled();
				});

				it('should handle invalid destination addresses', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

					await expect(sendIc(mockParams)).rejects.toThrow(en.send.error.invalid_destination);

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).not.toHaveBeenCalled();
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});

				it('should throw if the service throws', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

					vi.mocked(icrc1TransferIcp).mockRejectedValueOnce(new Error('Test error 1'));

					await expect(sendIc(mockParams)).rejects.toThrow('Test error 1');

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).toHaveBeenCalledOnce();
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();

					vi.clearAllMocks();

					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
					vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

					vi.mocked(transferIcp).mockRejectedValueOnce(new Error('Test error 2'));

					await expect(sendIc(mockParams)).rejects.toThrow('Test error 2');

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).toHaveBeenCalledOnce();
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});
			});

			describe('when token is DIP-20', () => {
				const mockParams = {
					...baseParams,
					token: mockValidDip20Token,
					targetNetworkId: undefined,
					sendCompleted: mockSendCompleted
				};

				beforeEach(() => {
					vi.clearAllMocks();

					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValue(false);
				});

				it('should execute full send flow', async () => {
					await sendIc(mockParams);

					expect(transferDip20).toHaveBeenCalledOnce();
					expect(transferDip20).toHaveBeenNthCalledWith(1, {
						identity: mockIdentity,
						canisterId: mockValidDip20Token.ledgerCanisterId,
						to: Principal.fromText(mockPrincipalText2),
						amount: mockAmount
					});
				});

				it('should call the auxiliary functions', async () => {
					await sendIc(mockParams);

					expect(mockSendCompleted).toHaveBeenCalledOnce();

					expect(mockProgress).toHaveBeenCalledTimes(2);
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsSendIc.RELOAD);

					expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
				});

				it('should not call the other services', async () => {
					await sendIc(mockParams);

					expect(convertCkBTCToBtc).not.toHaveBeenCalled();
					expect(convertCkETHToEth).not.toHaveBeenCalled();
					expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
					expect(icrc1TransferIcp).not.toHaveBeenCalled();
					expect(transferIcp).not.toHaveBeenCalled();
					expect(transferIcrc).not.toHaveBeenCalled();
				});

				it('should handle invalid destination addresses', async () => {
					vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);

					await expect(sendIc(mockParams)).rejects.toThrow(en.send.error.invalid_destination);

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).not.toHaveBeenCalled();
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});

				it('should throw if the service throws', async () => {
					vi.mocked(transferDip20).mockRejectedValueOnce(new Error('Test error'));

					await expect(sendIc(mockParams)).rejects.toThrow('Test error');

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).toHaveBeenCalledOnce();
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});
			});
		});

		describe('when target network is provided', () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			describe.each(SUPPORTED_BITCOIN_NETWORK_IDS)('and it is %s', (networkId) => {
				const mockParams = {
					...baseParams,
					token: mockValidIcCkToken,
					targetNetworkId: networkId,
					sendCompleted: mockSendCompleted
				};

				beforeEach(() => {
					vi.clearAllMocks();
				});

				it('should execute full conversion flow', async () => {
					await sendIc(mockParams);

					const { sendCompleted: _, targetNetworkId: __, ...expected } = mockParams;

					expect(convertCkBTCToBtc).toHaveBeenCalledOnce();
					expect(convertCkBTCToBtc).toHaveBeenNthCalledWith(1, expected);
				});

				it('should call the auxiliary functions', async () => {
					await sendIc(mockParams);

					expect(mockSendCompleted).toHaveBeenCalledOnce();

					expect(mockProgress).toHaveBeenCalledOnce();
					expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.RELOAD);

					expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
				});

				it('should not call the other services', async () => {
					await sendIc(mockParams);

					expect(convertCkETHToEth).not.toHaveBeenCalled();
					expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
					expect(icrc1TransferIcp).not.toHaveBeenCalled();
					expect(icrc1TransferIcp).not.toHaveBeenCalled();
					expect(transferIcp).not.toHaveBeenCalled();
					expect(transferIcrc).not.toHaveBeenCalled();
					expect(transferDip20).not.toHaveBeenCalled();
				});

				it('should throw if the service throws', async () => {
					vi.mocked(convertCkBTCToBtc).mockRejectedValueOnce(new Error('Test error'));

					await expect(sendIc(mockParams)).rejects.toThrow('Test error');

					expect(mockSendCompleted).not.toHaveBeenCalled();
					expect(mockProgress).not.toHaveBeenCalled();
					expect(waitAndTriggerWallet).not.toHaveBeenCalled();
				});
			});

			describe.each(SUPPORTED_ETHEREUM_NETWORK_IDS)('and it is %s', (networkId) => {
				beforeEach(() => {
					vi.clearAllMocks();
				});

				describe('when token is ckETH', () => {
					const mockParams = {
						...baseParams,
						token: { ...mockValidIcCkToken, ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID },
						targetNetworkId: networkId,
						sendCompleted: mockSendCompleted
					};

					beforeEach(() => {
						vi.clearAllMocks();
					});

					it('should execute full conversion flow', async () => {
						await sendIc(mockParams);

						const { sendCompleted: _, targetNetworkId: __, ...expected } = mockParams;

						expect(convertCkETHToEth).toHaveBeenCalledOnce();
						expect(convertCkETHToEth).toHaveBeenNthCalledWith(1, expected);
					});

					it('should call the auxiliary functions', async () => {
						await sendIc(mockParams);

						expect(mockSendCompleted).toHaveBeenCalledOnce();

						expect(mockProgress).toHaveBeenCalledOnce();
						expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.RELOAD);

						expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
					});

					it('should not call the other services', async () => {
						await sendIc(mockParams);

						expect(convertCkBTCToBtc).not.toHaveBeenCalled();
						expect(convertCkErc20ToErc20).not.toHaveBeenCalled();
						expect(icrc1TransferIcp).not.toHaveBeenCalled();
						expect(icrc1TransferIcp).not.toHaveBeenCalled();
						expect(transferIcp).not.toHaveBeenCalled();
						expect(transferIcrc).not.toHaveBeenCalled();
						expect(transferDip20).not.toHaveBeenCalled();
					});

					it('should throw if the service throws', async () => {
						vi.mocked(convertCkETHToEth).mockRejectedValueOnce(new Error('Test error'));

						await expect(sendIc(mockParams)).rejects.toThrow('Test error');

						expect(mockSendCompleted).not.toHaveBeenCalled();
						expect(mockProgress).not.toHaveBeenCalled();
						expect(waitAndTriggerWallet).not.toHaveBeenCalled();
					});
				});

				describe('when token is ckERC20', () => {
					const mockParams = {
						...baseParams,
						token: { ...mockValidIcCkToken, ledgerCanisterId: CKERC20_LEDGER_CANISTER_IDS[0] },
						targetNetworkId: networkId,
						sendCompleted: mockSendCompleted
					};

					beforeEach(() => {
						vi.clearAllMocks();
					});

					it('should execute full conversion flow', async () => {
						await sendIc(mockParams);

						const { sendCompleted: _, targetNetworkId: __, ...expected } = mockParams;

						expect(convertCkErc20ToErc20).toHaveBeenCalledOnce();
						expect(convertCkErc20ToErc20).toHaveBeenNthCalledWith(1, expected);
					});

					it('should call the auxiliary functions', async () => {
						await sendIc(mockParams);

						expect(mockSendCompleted).toHaveBeenCalledOnce();

						expect(mockProgress).toHaveBeenCalledOnce();
						expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.RELOAD);

						expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
					});

					it('should not call the other services', async () => {
						await sendIc(mockParams);

						expect(convertCkBTCToBtc).not.toHaveBeenCalled();
						expect(convertCkETHToEth).not.toHaveBeenCalled();
						expect(icrc1TransferIcp).not.toHaveBeenCalled();
						expect(icrc1TransferIcp).not.toHaveBeenCalled();
						expect(transferIcp).not.toHaveBeenCalled();
						expect(transferIcrc).not.toHaveBeenCalled();
						expect(transferDip20).not.toHaveBeenCalled();
					});

					it('should throw if the service throws', async () => {
						vi.mocked(convertCkErc20ToErc20).mockRejectedValueOnce(new Error('Test error'));

						await expect(sendIc(mockParams)).rejects.toThrow('Test error');

						expect(mockSendCompleted).not.toHaveBeenCalled();
						expect(mockProgress).not.toHaveBeenCalled();
						expect(waitAndTriggerWallet).not.toHaveBeenCalled();
					});
				});
			});
		});
	});

	describe('sendIcrc', () => {
		const mockParams = {
			to: mockPrincipalText2,
			amount: mockAmount,
			identity: mockIdentity,
			ledgerCanisterId: mockValidIcrcToken.ledgerCanisterId,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValue(false);
		});

		it('should execute full send flow', async () => {
			await sendIcrc(mockParams);

			expect(transferIcrc).toHaveBeenCalledOnce();
			expect(transferIcrc).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				ledgerCanisterId: mockValidIcrcToken.ledgerCanisterId,
				to: decodeIcrcAccount(mockPrincipalText2),
				amount: mockAmount
			});
		});

		it('should call the auxiliary function', async () => {
			await sendIcrc(mockParams);

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});

		it('should handle invalid destination addresses', () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);

			expect(() => sendIcrc(mockParams)).toThrow(en.send.error.invalid_destination);

			expect(mockProgress).not.toHaveBeenCalled();
		});

		it('should throw if the service throws', async () => {
			vi.mocked(transferIcrc).mockRejectedValueOnce(new Error('Test error'));

			await expect(sendIcrc(mockParams)).rejects.toThrow('Test error');

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});
	});

	describe('sendIcp', () => {
		const mockParams = {
			to: mockPrincipalText2,
			amount: mockAmount,
			identity: mockIdentity,
			ledgerCanisterId: mockLedgerCanisterId,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should execute full send flow if destination is a valid ICRC address', async () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

			await sendIcp(mockParams);

			expect(icrc1TransferIcp).toHaveBeenCalledOnce();
			expect(icrc1TransferIcp).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				to: decodeIcrcAccount(mockPrincipalText2),
				amount: mockAmount,
				ledgerCanisterId: mockLedgerCanisterId
			});

			expect(transferIcp).not.toHaveBeenCalled();
		});

		it('should execute full send flow if destination is a valid ICP address', async () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

			await sendIcp(mockParams);

			expect(transferIcp).toHaveBeenCalledOnce();
			expect(transferIcp).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				to: mockPrincipalText2,
				amount: mockAmount,
				ledgerCanisterId: mockLedgerCanisterId
			});

			expect(icrc1TransferIcp).not.toHaveBeenCalled();
		});

		it('should call the auxiliary function', async () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

			await sendIcp(mockParams);

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);

			vi.clearAllMocks();

			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

			await sendIcp(mockParams);

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});

		it('should handle invalid destination addresses', () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

			expect(() => sendIcp(mockParams)).toThrow(en.send.error.invalid_destination);

			expect(mockProgress).not.toHaveBeenCalled();
		});

		it('should throw if the service throws', async () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(false);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(true);

			vi.mocked(icrc1TransferIcp).mockRejectedValueOnce(new Error('Test error 1'));

			await expect(sendIcp(mockParams)).rejects.toThrow('Test error 1');

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);

			vi.clearAllMocks();

			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);
			vi.spyOn(accountUtils, 'invalidIcpAddress').mockReturnValueOnce(false);

			vi.mocked(transferIcp).mockRejectedValueOnce(new Error('Test error 2'));

			await expect(sendIcp(mockParams)).rejects.toThrow('Test error 2');

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});
	});

	describe('sendDip20', () => {
		const mockParams = {
			to: mockPrincipalText2,
			amount: mockAmount,
			identity: mockIdentity,
			ledgerCanisterId: mockValidIcrcToken.ledgerCanisterId,
			progress: mockProgress
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValue(false);
		});

		it('should execute full send flow', async () => {
			await sendDip20(mockParams);

			expect(transferDip20).toHaveBeenCalledOnce();
			expect(transferDip20).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				canisterId: mockValidDip20Token.ledgerCanisterId,
				to: Principal.fromText(mockPrincipalText2),
				amount: mockAmount
			});
		});

		it('should call the auxiliary function', async () => {
			await sendDip20(mockParams);

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});

		it('should handle invalid destination addresses', () => {
			vi.spyOn(icrcAccountUtils, 'invalidIcrcAddress').mockReturnValueOnce(true);

			expect(() => sendDip20(mockParams)).toThrow(en.send.error.invalid_destination);

			expect(mockProgress).not.toHaveBeenCalled();
		});

		it('should throw if the service throws', async () => {
			vi.mocked(transferDip20).mockRejectedValueOnce(new Error('Test error'));

			await expect(sendDip20(mockParams)).rejects.toThrow('Test error');

			expect(mockProgress).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsSendIc.SEND);
		});
	});
});
