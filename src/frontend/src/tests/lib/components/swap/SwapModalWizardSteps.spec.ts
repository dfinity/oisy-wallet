import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import SwapModalWizardSteps from '$lib/components/swap/SwapModalWizardSteps.svelte';
import { swapWizardSteps } from '$lib/config/swap.config';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import {
	MODAL_TOKENS_LIST,
	NETWORK_FILTER,
	SWAP_MODAL_SELECT_PROVIDER_STEP,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_CATEGORY_FILTER,
	TOKEN_INPUT_SELECT_TOKEN_BUTTON
} from '$lib/constants/test-ids.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as swapServices from '$lib/services/swap.services';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	initModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import {
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import { tokenCategoryFilterStore } from '$lib/stores/settings.store';
import {
	SWAP_AMOUNTS_CONTEXT_KEY,
	initSwapAmountsStore,
	type SwapAmountsStoreData
} from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { WizardModal, WizardStep } from '$lib/types/wizard';
import { parseTokenId } from '$lib/validation/token.validation';
import SwapModalWizardStepsTestHost from '$tests/lib/components/swap/SwapModalWizardStepsTestHost.svelte';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { openFilterChip } from '$tests/utils/filter-chip.test-utils';
import {
	mockModalNetworksListContextEntry,
	mockModalTokensListContextEntry
} from '$tests/utils/misc.context.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, readable } from 'svelte/store';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: () => Promise.resolve([])
}));

// A Bitcoin source mounts the real UTXO loaders, whose whole job is to call out.
vi.mock('$btc/services/btc-utxos.service', async () => {
	const { ZERO } = await import('$lib/constants/app.constants');
	return {
		getFeeRateFromPercentiles: vi.fn().mockResolvedValue(2_000n),
		prepareBtcSend: vi.fn().mockReturnValue({ feeSatoshis: ZERO, utxos: [] })
	};
});

vi.mock('$icp/api/bitcoin.api', () => ({
	getUtxosQuery: vi.fn().mockResolvedValue({ utxos: [], tip_height: 0, tip_block_hash: [] })
}));

vi.mock('$btc/services/btc-pending-sent-transactions.services', () => ({
	loadBtcPendingSentTransactions: vi.fn().mockResolvedValue(undefined)
}));

describe('SwapModalWizardSteps', () => {
	const mockContext = new Map();

	const mockSwapAmounts: SwapAmountsStoreData = {
		amountForSwap: 1,
		swaps: mockSwapProviders,
		selectedProvider: mockSwapProviders[0]
	};

	const mockModal: WizardModal<WizardStepsSwap> = {
		set: vi.fn(),
		next: vi.fn(),
		back: vi.fn()
	};

	beforeEach(() => {
		const mockToken = { ...mockValidIcToken, enabled: true };

		const originalContext = initSwapContext({
			sourceToken: mockToken,
			destinationToken: mockToken
		});

		const mockSwapContext = {
			...originalContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);
	});

	const setupSwapAmountsStore = (swapAmounts?: SwapAmountsStoreData) => {
		const swapAmountsStore = initSwapAmountsStore();
		if (swapAmounts) {
			swapAmountsStore.setSwaps(swapAmounts);
		}
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	const setupModalTokensListContext = () => {
		mockContext.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] }));
	};

	const setupModalNetworksListContext = () => {
		mockContext.set(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({ networks: [] })
		);
	};

	const renderSwapModalWizardSteps = (currentStep: WizardStep<WizardStepsSwap>) =>
		render(SwapModalWizardSteps, {
			props: {
				swapAmount: '1',
				receiveAmount: 2,
				slippageValue: undefined,
				onClose: vi.fn(),
				currentStep,
				swapProgressStep: ProgressStepsSwap.INITIALIZATION,
				modal: mockModal,
				steps: [
					{
						name: WizardStepsSwap.SWAP,
						title: en.swap.text.swap
					},
					{
						name: WizardStepsSwap.REVIEW,
						title: en.swap.text.review
					},
					{
						name: WizardStepsSwap.SWAPPING,
						title: en.swap.text.executing_transaction
					},
					{
						name: WizardStepsSwap.TOKENS_LIST,
						title: en.send.text.select_token
					},
					{
						name: WizardStepsSwap.SELECT_PROVIDER,
						title: en.swap.text.select_swap_provider
					}
				]
			},
			context: mockContext
		});

	describe('display values', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
			setupModalTokensListContext();
			setupModalNetworksListContext();
		});

		it('should display TOKENS_LIST step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.TOKENS_LIST,
				title: 'title'
			});

			expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		});

		it('should show the network filter in the TOKENS_LIST step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.TOKENS_LIST,
				title: 'title'
			});

			expect(getByTestId(NETWORK_FILTER)).toBeInTheDocument();
		});

		it('should display SELECT_PROVIDER step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SELECT_PROVIDER,
				title: 'title'
			});

			expect(getByTestId(SWAP_MODAL_SELECT_PROVIDER_STEP)).toBeInTheDocument();
		});

		it('should display SWAP step', () => {
			const { getByTestId } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAP,
				title: 'title'
			});

			expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();
		});

		it('should show the networks in their brand colours', () => {
			const { icon, iconColored } = mockValidIcToken.network;

			const { container } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAP,
				title: 'title'
			});

			const sources = Array.from(container.querySelectorAll('img')).map((img) =>
				img.getAttribute('src')
			);

			expect(iconColored).toBeDefined();
			expect(sources).toContain(iconColored);
			expect(sources).not.toContain(icon);
		});

		it('should display REVIEW step', () => {
			const { getByText } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.REVIEW,
				title: 'title'
			});

			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
		});

		it('should display SWAPPING step', () => {
			const { getByText } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAPPING,
				title: 'title'
			});

			expect(getByText(en.swap.text.initializing)).toBeInTheDocument();
		});
	});

	// `SwapBtcContexts` wraps the per-step `{#key}` rather than sitting inside it. Below the
	// key, walking from the form to Review tore it down: its teardown clears the three
	// Bitcoin stores, and its `UtxosFeeContexts` handed Review a fresh empty fee store. The
	// refill needs two update calls, and confirming inside that window failed on a missing
	// fee — the "error on the first click, works on the second" the swap flow used to show.
	describe('Bitcoin source across a step change', () => {
		const fillBtcStores = () => {
			allUtxosStore.setAllUtxos({ allUtxos: [mockUtxo] });
			feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 2_000n });
			btcPendingSentTransactionsStore.setPendingTransactions({
				address: mockBtcAddress,
				pendingTransactions: []
			});
		};

		const btcStoresPopulated = () =>
			[
				get(allUtxosStore)?.allUtxos,
				get(feeRatePercentilesStore)?.feeRateFromPercentiles,
				get(btcPendingSentTransactionsStore)[mockBtcAddress]
			].every((value) => value !== undefined && value !== null);

		beforeEach(() => {
			allUtxosStore.reset();
			feeRatePercentilesStore.reset();
			btcPendingSentTransactionsStore.reset();

			vi.spyOn(addressDerived, 'btcAddressMainnet', 'get').mockReturnValue(
				readable(mockBtcAddress)
			);

			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
			setupModalTokensListContext();
			setupModalNetworksListContext();

			const btcToken = { ...BTC_MAINNET_TOKEN, enabled: true };

			mockContext.set(SWAP_CONTEXT_KEY, {
				...initSwapContext({ sourceToken: btcToken, destinationToken: btcToken }),
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2)
			});
		});

		it('keeps the Bitcoin UTXO data when moving from the form to Review', async () => {
			// Pre-filled, so every loader's effect short-circuits and a later call can only come
			// from a remount.
			fillBtcStores();

			const { rerender } = renderSwapModalWizardSteps({
				name: WizardStepsSwap.SWAP,
				title: 'title'
			});

			await tick();

			expect(btcStoresPopulated()).toBeTruthy();

			await rerender({ currentStep: { name: WizardStepsSwap.REVIEW, title: 'title' } });

			expect(btcStoresPopulated()).toBeTruthy();
			expect(loadBtcPendingSentTransactions).not.toHaveBeenCalled();
		});
	});

	describe('token list filters', () => {
		const steps = swapWizardSteps({ i18n: en });

		const swapStep = { name: WizardStepsSwap.SWAP, title: 'title' };
		const tokensListStep = { name: WizardStepsSwap.TOKENS_LIST, title: 'title' };

		const renderHost = () =>
			render(SwapModalWizardStepsTestHost, {
				props: { currentStep: swapStep, steps, modal: mockModal },
				context: mockContext
			});

		type Rendered = ReturnType<typeof renderHost>;

		const openList = async ({ rendered, side }: { rendered: Rendered; side: 0 | 1 }) => {
			await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[side]);
			await rendered.rerender({ currentStep: tokensListStep, steps, modal: mockModal });

			// The form plays its exit first and stays until it ends, with its own token buttons.
			await waitFor(() =>
				expect(screen.queryByTestId(SWAP_SWITCH_TOKENS_BUTTON)).not.toBeInTheDocument()
			);
		};

		const showForm = async (rendered: Rendered) => {
			await rendered.rerender({ currentStep: swapStep, steps, modal: mockModal });

			// A filter panel closed just before plays its exit first, and the list stays until it ends.
			await waitFor(() => expect(screen.queryByTestId(MODAL_TOKENS_LIST)).not.toBeInTheDocument());
		};

		const cancelList = async (rendered: Rendered) => {
			await fireEvent.click(rendered.getByText(en.core.text.cancel));
			await showForm(rendered);
		};

		const pickFromChip = async ({ chip, option }: { chip: string; option: string }) => {
			const panel = await openFilterChip(chip);

			await fireEvent.click(within(panel).getByText(option));
		};

		const networkChip = () => screen.getByTestId(NETWORK_FILTER);
		const assetTypeChip = () => screen.getByTestId(TOKEN_CATEGORY_FILTER);

		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			mockContext.set(...mockModalTokensListContextEntry({ tokens: [] }));
			mockContext.set(...mockModalNetworksListContextEntry({ networks: [ICP_NETWORK] }));

			// A universe with something on ICP, so the list offers Internet Computer as a network.
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
				readable([{ ...ICP_TOKEN, enabled: true }])
			);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("opens the pay list on all networks, not on the pay token's network", async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 0 });

			expect(networkChip()).toHaveTextContent(en.networks.chain_fusion);
		});

		it('keeps the network the list was left on after a token is picked', async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 0 });

			// All networks, then a pick on Internet Computer: the old picker switched to its network.
			await fireEvent.click(rendered.getByRole('button', { name: new RegExp(ICP_TOKEN.symbol) }));
			await showForm(rendered);

			await openList({ rendered, side: 0 });

			expect(networkChip()).toHaveTextContent(en.networks.chain_fusion);
		});

		it('reopens the pay list on the filters it was left on', async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 0 });

			await pickFromChip({ chip: NETWORK_FILTER, option: ICP_NETWORK.name });
			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });

			await cancelList(rendered);

			await openList({ rendered, side: 0 });

			expect(networkChip()).toHaveTextContent(ICP_NETWORK.name);
			expect(assetTypeChip()).toHaveTextContent(en.token_tag.category.crypto);
		});

		it("opens the receive list on the pay token's network and the pay list's asset type", async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 0 });

			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });

			await cancelList(rendered);

			await openList({ rendered, side: 1 });

			// The pay token is on Internet Computer: a same-network swap is one pick away.
			expect(networkChip()).toHaveTextContent(ICP_NETWORK.name);
			expect(assetTypeChip()).toHaveTextContent(en.token_tag.category.crypto);
		});

		it('keeps the receive list following the pay side until its filters are changed', async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 1 });

			expect(assetTypeChip()).toHaveTextContent(en.tokens.text.asset_type_all_short);

			await cancelList(rendered);

			await openList({ rendered, side: 0 });

			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });

			await cancelList(rendered);

			await openList({ rendered, side: 1 });

			expect(assetTypeChip()).toHaveTextContent(en.token_tag.category.crypto);
		});

		it('keeps Max when the pay token already picked is picked again', async () => {
			const swapContext = initSwapContext({
				sourceToken: ICP_TOKEN,
				destinationToken: mockValidIcToken
			});

			swapContext.amountSetToMax.set(true);

			mockContext.set(SWAP_CONTEXT_KEY, {
				...swapContext,
				sourceTokenExchangeRate: readable(10),
				destinationTokenExchangeRate: readable(2)
			});

			const rendered = renderHost();

			await openList({ rendered, side: 0 });

			// Nothing changes, so nothing is reset: a new pay token would clear Max and its LI.FI fee.
			await fireEvent.click(rendered.getByRole('button', { name: new RegExp(ICP_TOKEN.symbol) }));
			await showForm(rendered);

			expect(get(swapContext.amountSetToMax)).toBeTruthy();
		});

		describe('with Bitcoin to pay', () => {
			const btcToken = { ...BTC_MAINNET_TOKEN, enabled: true };

			beforeEach(() => {
				vi.spyOn(addressDerived, 'btcAddressMainnet', 'get').mockReturnValue(
					readable(mockBtcAddress)
				);

				mockContext.set(SWAP_CONTEXT_KEY, {
					...initSwapContext({ sourceToken: btcToken, destinationToken: mockValidIcToken }),
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				mockContext.set(
					...mockModalNetworksListContextEntry({ networks: [ICP_NETWORK, BTC_MAINNET_NETWORK] })
				);

				vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
					readable([{ ...ICP_TOKEN, enabled: true }, btcToken])
				);
			});

			it('opens the receive list on all networks, since Bitcoin has nothing else to receive', async () => {
				const rendered = renderHost();

				await openList({ rendered, side: 1 });

				expect(networkChip()).toHaveTextContent(en.networks.chain_fusion);
				expect(
					rendered.getByRole('button', { name: new RegExp(ICP_TOKEN.symbol) })
				).toBeInTheDocument();
				expect(
					rendered.queryByRole('button', { name: new RegExp(`^${BTC_MAINNET_TOKEN.symbol}`) })
				).not.toBeInTheDocument();
			});
		});

		describe('on the assets page with an asset type picked', () => {
			beforeEach(() => {
				mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

				tokenCategoryFilterStore.set({
					key: 'token-category-filter',
					value: { value: TokenCategoryTagValue.CRYPTO }
				});
			});

			afterEach(() => {
				tokenCategoryFilterStore.reset({ key: 'token-category-filter' });

				mockPage.reset();
			});

			it('opens the receive list on all asset types once the pay list is cleared to them', async () => {
				const rendered = renderHost();

				await openList({ rendered, side: 0 });

				expect(assetTypeChip()).toHaveTextContent(en.token_tag.category.crypto);

				await fireEvent.click(screen.getByTestId(`${TOKEN_CATEGORY_FILTER}-clear`));

				await cancelList(rendered);

				await openList({ rendered, side: 1 });

				expect(assetTypeChip()).toHaveTextContent(en.tokens.text.asset_type_all_short);
			});
		});

		it("keeps the receive list's own filters once changed, even back to where they started", async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 1 });

			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });
			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.tokens.text.asset_type_all });

			await cancelList(rendered);

			await openList({ rendered, side: 0 });

			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });

			await cancelList(rendered);

			await openList({ rendered, side: 1 });

			expect(assetTypeChip()).toHaveTextContent(en.tokens.text.asset_type_all_short);
		});

		it("keeps the receive list's own filters once they are changed", async () => {
			const rendered = renderHost();

			await openList({ rendered, side: 1 });

			await fireEvent.click(screen.getByTestId(`${NETWORK_FILTER}-clear`));

			await cancelList(rendered);

			await openList({ rendered, side: 0 });

			await pickFromChip({ chip: TOKEN_CATEGORY_FILTER, option: en.token_tag.category.crypto });

			await cancelList(rendered);

			await openList({ rendered, side: 1 });

			expect(networkChip()).toHaveTextContent(en.networks.chain_fusion);
			expect(assetTypeChip()).toHaveTextContent(en.tokens.text.asset_type_all_short);
		});
	});

	describe('prices of disabled tokens', () => {
		const disabledToken: Erc20CustomToken = { ...mockValidErc20Token, enabled: false };
		const lateToken: Erc20CustomToken = {
			...mockValidErc20Token,
			id: parseTokenId('LateErc20TokenId'),
			address: mockEthAddress2,
			enabled: false
		};

		const tokensListStep: WizardStep<WizardStepsSwap> = {
			name: WizardStepsSwap.TOKENS_LIST,
			title: 'title'
		};

		const pricedSymbols = () =>
			vi
				.mocked(swapServices.loadDisabledErc20AndSplTokensExchanges)
				.mock.calls.map(([{ tokens }]) => tokens.map(({ symbol }) => symbol));

		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
			setupModalTokensListContext();
			setupModalNetworksListContext();
			setupUserNetworksStore('allEnabled');

			erc20DefaultTokensStore.reset();
			erc20CustomTokensStore.resetAll();
			erc20CustomTokensStore.setAll([{ data: disabledToken, certified: false }]);

			vi.spyOn(swapServices, 'loadDisabledErc20AndSplTokensExchanges').mockResolvedValue(undefined);
		});

		afterEach(() => {
			erc20CustomTokensStore.resetAll();

			vi.restoreAllMocks();
		});

		it('should price the disabled tokens when it opens', async () => {
			renderSwapModalWizardSteps(tokensListStep);

			await tick();

			expect(pricedSymbols()).toEqual([[disabledToken.symbol]]);
		});

		it('should price a disabled token that arrives later, and only that one', async () => {
			renderSwapModalWizardSteps(tokensListStep);

			await tick();

			erc20CustomTokensStore.setAll([
				{ data: disabledToken, certified: false },
				{ data: { ...lateToken, symbol: 'LATE' }, certified: false }
			]);

			await tick();

			expect(pricedSymbols()).toEqual([[disabledToken.symbol], ['LATE']]);
		});

		// Get Token renders the wizard in a block keyed by the step, so every step change mounts a new
		// one on the same swap context.
		it('should not price the tokens again when it is rebuilt on a step change', async () => {
			const { unmount } = renderSwapModalWizardSteps(tokensListStep);

			await tick();

			unmount();

			renderSwapModalWizardSteps({ name: WizardStepsSwap.SWAP, title: 'title' });

			await tick();

			expect(pricedSymbols()).toEqual([[disabledToken.symbol]]);
		});

		it('should warn and carry on when loading the prices fails', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(swapServices, 'loadDisabledErc20AndSplTokensExchanges').mockRejectedValue(
				new Error('down')
			);

			renderSwapModalWizardSteps(tokensListStep);

			await waitFor(() => expect(warn).toHaveBeenCalled());

			expect(screen.getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		});
	});
});
