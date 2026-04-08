import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HarvestStakeWizard from '$eth/components/stake/harvest-autopilot/HarvestStakeWizard.svelte';
import * as erc4626Services from '$eth/services/erc4626.services';
import type { EthFeeStore, FeeStoreData } from '$eth/stores/eth-fee.store';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_SUBCONTEXT_EARN,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([ETHEREUM_TOKEN]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$eth/services/eth-listener.services', () => ({
	initMinedTransactionsListener: vi.fn(() => ({
		disconnect: vi.fn()
	}))
}));

describe('HarvestStakeWizard', () => {
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

	const mockVaultToken = {
		...mockValidErc4626Token,
		network: ETHEREUM_NETWORK,
		enabled: true
	};

	const mockVault: Vault = {
		token: mockVaultToken,
		apy: '5.5'
	};

	let feeState: Writable<FeeStoreData>;
	let feeStore: EthFeeStore;

	const buildContext = () => {
		const context = new Map([]);
		context.set(SEND_CONTEXT_KEY, initSendContext({ token: mockVaultToken }));
		return context;
	};

	const baseProps = {
		amount: 0.01,
		stakeProgressStep: 'initialization',
		vault: mockVault,
		onClose: vi.fn(),
		onBack: vi.fn(),
		onNext: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should render HarvestStakeForm when current step is STAKE', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.STAKE, title: 'Stake' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.review);
	});

	it('should render HarvestStakeReview when current step is REVIEW', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.stake.text.stake_now);
	});

	it('should render StakeProgress when current step is STAKING', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: { name: WizardStepsStake.STAKING, title: 'Staking' }
			},
			context: buildContext()
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
	});

	it('should not render form or review content when current step is undefined', () => {
		const { container } = render(HarvestStakeWizard, {
			props: {
				...baseProps,
				currentStep: undefined
			},
			context: buildContext()
		});

		expect(container).not.toHaveTextContent(en.send.text.review);
		expect(container).not.toHaveTextContent(en.stake.text.stake_now);
		expect(container).not.toHaveTextContent(en.send.text.initializing);
	});

	describe('stake tracking metadata', () => {
		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
			vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(erc4626Services, 'depositErc4626').mockResolvedValue(undefined);

			feeState = writable({
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			feeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => {
					feeState.update((cur) => ({ ...cur, ...partial }));
				})
			};
			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
		});

		it('should call trackEvent with error metadata when stake fails', async () => {
			const stakeError = new Error('execution reverted');
			Object.assign(stakeError, { code: 'CALL_EXCEPTION' });
			vi.spyOn(erc4626Services, 'depositErc4626').mockRejectedValue(stakeError);

			const { getByTestId } = render(HarvestStakeWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
				},
				context: buildContext()
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.STAKE,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.EARN,
					event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_EARN.HARVEST_AUTOPILOT,
					source_location: PLAUSIBLE_EVENT_SOURCES.HARVEST_AUTOPILOT,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					result_error_text: 'execution reverted',
					result_error: 'Error',
					result_error_code: 'CALL_EXCEPTION'
				})
			});
		});

		it('should call trackEvent with correct metadata on successful stake', async () => {
			const { getByTestId } = render(HarvestStakeWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
				},
				context: buildContext()
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.STAKE,
				metadata: expect.objectContaining({
					event_context: PLAUSIBLE_EVENT_CONTEXTS.EARN,
					event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_EARN.HARVEST_AUTOPILOT,
					source_location: PLAUSIBLE_EVENT_SOURCES.HARVEST_AUTOPILOT,
					source_sublocation: mockVaultToken.name,
					token_network: mockVaultToken.network.name,
					token_address: mockVaultToken.address,
					token_standard: mockVaultToken.standard.code,
					token_symbol: mockVaultToken.symbol,
					token_name: mockVaultToken.name,
					token_amount: `${baseProps.amount}`,
					token2_network: mockVault.token.network.name,
					token2_address: mockVault.token.address,
					token2_standard: mockVault.token.standard.code,
					token2_symbol: mockVault.token.symbol,
					token2_name: mockVault.token.name,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				})
			});
		});
	});

	describe('enable vault after staking', () => {
		let toggleSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
			vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(erc4626Services, 'depositErc4626').mockResolvedValue(undefined);
			toggleSpy = vi.spyOn(erc4626Services, 'toggleErc4626Token').mockResolvedValue(undefined);

			feeState = writable({
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			feeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => {
					feeState.update((cur) => ({ ...cur, ...partial }));
				})
			};
			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
		});

		it('should enable the vault token when it is disabled after successful stake', async () => {
			const disabledVaultToken = { ...mockVaultToken, enabled: false };
			const disabledVault: Vault = { token: disabledVaultToken, apy: '5.5' };
			const disabledContext = new Map([]);
			disabledContext.set(SEND_CONTEXT_KEY, initSendContext({ token: disabledVaultToken }));

			const { getByTestId } = render(HarvestStakeWizard, {
				props: {
					...baseProps,
					vault: disabledVault,
					currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
				},
				context: disabledContext
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(toggleSpy).toHaveBeenCalledWith({
				token: disabledVaultToken,
				identity: mockIdentity,
				enabled: true
			});
		});

		it('should not enable the vault token when it is already enabled', async () => {
			const { getByTestId } = render(HarvestStakeWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
				},
				context: buildContext()
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(toggleSpy).not.toHaveBeenCalled();
		});

		it('should still close the modal when enabling the vault token fails', async () => {
			toggleSpy.mockRejectedValue(new Error('Enable failed'));

			const disabledVaultToken = { ...mockVaultToken, enabled: false };
			const disabledVault: Vault = { token: disabledVaultToken, apy: '5.5' };
			const disabledContext = new Map([]);
			disabledContext.set(SEND_CONTEXT_KEY, initSendContext({ token: disabledVaultToken }));

			const onClose = vi.fn();

			const { getByTestId } = render(HarvestStakeWizard, {
				props: {
					...baseProps,
					vault: disabledVault,
					onClose,
					currentStep: { name: WizardStepsStake.REVIEW, title: 'Review' }
				},
				context: disabledContext
			});

			await fireEvent.click(getByTestId(STAKE_REVIEW_FORM_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(onClose).toHaveBeenCalled();
		});
	});
});
