import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { sendSteps } from '$icp/constants/steps.constants';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import type { ProgressStep } from '@dfinity/gix-components';

describe('steps.constants', () => {
	describe('sendSteps', () => {
		const mockSendStepInitialization: ProgressStep = {
			step: ProgressStepsSendIc.INITIALIZATION,
			text: en.send.text.initializing_transaction,
			state: 'in_progress'
		};
		const mockSendStepApproveFees: ProgressStep = {
			step: ProgressStepsSendIc.APPROVE_FEES,
			text: en.send.text.approving_fees,
			state: 'next'
		};
		const mockSendStepApproveTransfer: ProgressStep = {
			step: ProgressStepsSendIc.APPROVE_TRANSFER,
			text: en.send.text.approving,
			state: 'next'
		};
		const mockSendStepApproveTransferCkErc20: ProgressStep = {
			step: ProgressStepsSendIc.APPROVE_TRANSFER,
			text: en.send.text.approving_transfer,
			state: 'next'
		};
		const mockSendStepSend: ProgressStep = {
			step: ProgressStepsSendIc.SEND,
			text: en.send.text.sending,
			state: 'next'
		};
		const mockSendStepReload: ProgressStep = {
			step: ProgressStepsSendIc.RELOAD,
			text: en.send.text.refreshing_ui,
			state: 'next'
		};

		const mockParams = {
			i18n: en,
			networkId: ICP_NETWORK_ID,
			tokenCkErc20Ledger: false
		};

		it('should return the correct steps with expected text and state', () => {
			const steps = sendSteps(mockParams);

			expect(steps).toEqual([mockSendStepInitialization, mockSendStepSend, mockSendStepReload]);
		});

		it('should return the correct steps with expected text and state if the token is a ckERC20 Ledger', () => {
			const steps = sendSteps({ ...mockParams, tokenCkErc20Ledger: true });

			expect(steps).toEqual([
				mockSendStepInitialization,
				mockSendStepApproveFees,
				mockSendStepSend,
				mockSendStepReload
			]);
		});

		it('should return the correct steps with expected text and state if the network is Bitcoin', () => {
			const steps = sendSteps({ ...mockParams, networkId: BTC_MAINNET_NETWORK_ID });

			expect(steps).toEqual([
				mockSendStepInitialization,
				mockSendStepApproveTransfer,
				mockSendStepSend,
				mockSendStepReload
			]);
		});

		it('should return the correct steps with expected text and state if the network is Ethereum', () => {
			const steps = sendSteps({ ...mockParams, networkId: ETHEREUM_NETWORK_ID });

			expect(steps).toEqual([
				mockSendStepInitialization,
				mockSendStepApproveTransfer,
				mockSendStepSend,
				mockSendStepReload
			]);
		});

		it('should return the correct steps with expected text and state if the network is Bitcoin and the token is a ckERC20 Ledger', () => {
			const steps = sendSteps({
				...mockParams,
				networkId: BTC_MAINNET_NETWORK_ID,
				tokenCkErc20Ledger: true
			});

			expect(steps).toEqual([
				mockSendStepInitialization,
				mockSendStepApproveFees,
				mockSendStepApproveTransferCkErc20,
				mockSendStepSend,
				mockSendStepReload
			]);
		});

		it('should return the correct steps with expected text and state if the network is Ethereum and the token is a ckERC20 Ledger', () => {
			const steps = sendSteps({
				...mockParams,
				networkId: ETHEREUM_NETWORK_ID,
				tokenCkErc20Ledger: true
			});

			expect(steps).toEqual([
				mockSendStepInitialization,
				mockSendStepApproveFees,
				mockSendStepApproveTransferCkErc20,
				mockSendStepSend,
				mockSendStepReload
			]);
		});
	});
});
