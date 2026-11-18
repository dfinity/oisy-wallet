import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import { USDC_TOKEN as ETHEREUM_USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { USDC_TOKEN as SOLANA_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import GetTokenModal from '$lib/components/get-token/GetTokenModal.svelte';
import SwapModal from '$lib/components/swap/SwapModal.svelte';
import {
	GET_TOKEN_MODAL_OPEN_SWAP_BUTTON,
	MODAL_TOKENS_LIST,
	NETWORK_FILTER,
	SWAP_CLEAR_DESTINATION_TOKEN,
	SWAP_RECEIVE_NETWORK_LIST,
	SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
	SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
	SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_SELECT_TOKEN_BUTTON
} from '$lib/constants/test-ids.constants';
import * as crossChainNetworksDerived from '$lib/derived/cross-chain-networks.derived';
import * as networksDerived from '$lib/derived/networks.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as shortcutAnalytics from '$lib/services/swap-receive-shortcut-analytics.services';
import {
	MODAL_NETWORKS_LIST_CONTEXT_KEY,
	initModalNetworksListContext
} from '$lib/stores/modal-networks-list.store';
import {
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import * as deviceUtils from '$lib/utils/device.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

vi.mock('$icp/api/icrc-ledger.api', () => ({
	icrc1SupportedStandards: () => Promise.resolve([])
}));

describe('GetTokenModal', () => {
	const mockContext = new Map();

	const mockSwapContext = () => {
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
	};

	const setupSwapAmountsStore = () => {
		const swapAmountsStore = initSwapAmountsStore();
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupModalTokensListContext = () => {
		mockContext.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] }));
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	const setupModalNetworksListContext = () => {
		mockContext.set(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({ networks: [] })
		);
	};

	beforeEach(() => {
		mockSwapContext();
		setupSwapAmountsStore();
		setupIcTokenFeeStore();
		setupModalTokensListContext();
		setupModalNetworksListContext();
	});

	const renderGetTokenModal = () =>
		render(GetTokenModal, {
			props: {
				token: ICP_TOKEN,
				currentApy: 10
			},
			context: mockContext
		});

	describe.each(['Swap', 'Get Token'])('%s picker focus', (flow) => {
		afterEach(() => vi.restoreAllMocks());

		const setup = async (sourceToken: Token = BASE_USDC_TOKEN) => {
			const networks: Network[] = [BASE_NETWORK, ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK];
			if (!networks.some(({ id }) => id === sourceToken.network.id)) {
				networks.push(sourceToken.network);
			}
			const swapContext = {
				...initSwapContext({ sourceToken }),
				receiveSupportedData: readable({
					icp: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
					evm: {
						coverage: 'all' as const,
						supportedTokenIds: new Set([
							nativeSwapTokenIdentifier({
								networkId: BASE_ETH_TOKEN.network.id,
								symbol: BASE_ETH_TOKEN.symbol
							}),
							ETHEREUM_USDC_TOKEN.address.toLowerCase(),
							nativeSwapTokenIdentifier({
								networkId: ETHEREUM_TOKEN.network.id,
								symbol: ETHEREUM_TOKEN.symbol
							})
						])
					},
					sol: {
						coverage: 'all' as const,
						supportedTokenIds: new Set([SOLANA_USDC_TOKEN.address])
					},
					btc: { coverage: 'all' as const, supportedTokenIds: new Set<string>() },
					xrp: { coverage: 'all' as const, supportedTokenIds: new Set<string>() }
				})
			};
			mockContext.set(SWAP_CONTEXT_KEY, swapContext);
			mockContext.set(MODAL_NETWORKS_LIST_CONTEXT_KEY, initModalNetworksListContext({ networks }));
			const universe = writable(
				[sourceToken, BASE_ETH_TOKEN, ETHEREUM_TOKEN, ETHEREUM_USDC_TOKEN, SOLANA_USDC_TOKEN].map(
					(token) => ({ ...token, enabled: true })
				)
			);
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(universe);
			vi.spyOn(crossChainNetworksDerived, 'crossChainSwapNetworksMainnets', 'get').mockReturnValue(
				readable(networks)
			);
			vi.spyOn(networksDerived, 'networks', 'get').mockReturnValue(readable(networks));

			const rendered =
				flow === 'Swap' ? render(SwapModal, { context: mockContext }) : renderGetTokenModal();
			if (flow === 'Get Token') {
				mockAuthStore();
				vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);
				await fireEvent.click(rendered.getByTestId(GET_TOKEN_MODAL_OPEN_SWAP_BUTTON));
				await waitFor(() =>
					expect(rendered.getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument()
				);
				swapContext.clearDestinationToken();
			}
			return { ...rendered, universe, swapContext };
		};

		it.each([
			SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
			SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
			SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK
		])('should reopen %s after selecting a receive token', async (shortcut) => {
			const rendered = await setup();
			await fireEvent.click(await rendered.findByTestId(shortcut));
			if (shortcut === SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK) {
				const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
				await fireEvent.click(within(list).getAllByRole('button')[0]);
			} else {
				await fireEvent.click(
					await rendered.findByRole('button', {
						name: new RegExp(`${BASE_ETH_TOKEN.symbol}.*${BASE_NETWORK.name}`)
					})
				);
			}

			await waitFor(() =>
				expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
			);

			// Reopening and then returning with Back must keep the same receive view.
			for (let opening = 0; opening < 2; opening++) {
				await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);
				if (shortcut === SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK) {
					await expect(
						rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST)
					).resolves.toBeInTheDocument();
					expect(rendered.queryByTestId(MODAL_TOKENS_LIST)).not.toBeInTheDocument();
				} else {
					await expect(rendered.findByTestId(MODAL_TOKENS_LIST)).resolves.toBeInTheDocument();
					expect(rendered.getByTestId(NETWORK_FILTER)).toHaveTextContent(
						shortcut === SWAP_RECEIVE_SHORTCUT_SAME_NETWORK
							? BASE_NETWORK.name
							: en.networks.chain_fusion
					);
				}
				await fireEvent.click(rendered.getByRole('button', { name: en.core.text.back }));
				await waitFor(() =>
					expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
				);
			}
		});

		it.each([BASE_ETH_TOKEN, ETHEREUM_TOKEN])(
			'should open the ordinary receive list after an intermediate token on $network.name replaces the group pick',
			async (intermediateToken) => {
				const rendered = await setup();
				await fireEvent.click(await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));
				const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
				await fireEvent.click(within(list).getAllByRole('button')[0]);
				await waitFor(() =>
					expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
				);

				// The two-swaps hint replaces just the destination, leaving the remembered picker intact.
				rendered.swapContext.setDestinationToken(intermediateToken);
				await waitFor(() =>
					expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]).toHaveTextContent(
						intermediateToken.symbol
					)
				);
				await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);

				await expect(rendered.findByTestId(MODAL_TOKENS_LIST)).resolves.toBeInTheDocument();
				expect(rendered.queryByTestId(SWAP_RECEIVE_NETWORK_LIST)).not.toBeInTheDocument();
				expect(get(rendered.swapContext.receiveTokenPickerStep)).toBe(WizardStepsSwap.TOKENS_LIST);
			}
		);

		it('should count only the shortcut entry when its network list is later reopened', async () => {
			const rendered = await setup();
			const track = vi
				.spyOn(shortcutAnalytics, 'trackSwapReceiveShortcut')
				.mockImplementation(() => {});
			await fireEvent.click(await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));
			const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
			await fireEvent.click(within(list).getAllByRole('button')[0]);

			expect(track).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ action: 'other_network' })
			);

			for (const rowIndex of [0, 1]) {
				await waitFor(() =>
					expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
				);
				await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);
				const reopened = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);

				expect(within(reopened).getByRole('button', { pressed: true })).toHaveTextContent(
					ETHEREUM_NETWORK.name
				);

				await fireEvent.click(within(reopened).getAllByRole('button')[rowIndex]);

				expect(track).toHaveBeenCalledOnce();
			}
		});

		it('should reopen the network list after a one-tap group shortcut', async () => {
			const rendered = await setup();
			rendered.universe.update((tokens) =>
				tokens.filter(({ network }) => network.id !== ETHEREUM_NETWORK.id)
			);
			const shortcut = await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK);
			await waitFor(() => expect(shortcut).toHaveTextContent(SOLANA_MAINNET_NETWORK.name));
			await fireEvent.click(shortcut);
			await waitFor(() =>
				expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
			);

			expect(rendered.queryByTestId(SWAP_RECEIVE_NETWORK_LIST)).not.toBeInTheDocument();

			await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);
			const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);

			expect(within(list).getAllByRole('button')).toHaveLength(1);
		});

		it('should replace the remembered network step when another shortcut is chosen', async () => {
			const rendered = await setup();
			await fireEvent.click(await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));
			const networks = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
			await fireEvent.click(within(networks).getAllByRole('button')[0]);
			await fireEvent.click(await rendered.findByTestId(SWAP_CLEAR_DESTINATION_TOKEN));
			await fireEvent.click(await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN));
			await fireEvent.click(
				await rendered.findByRole('button', {
					name: new RegExp(`${BASE_ETH_TOKEN.symbol}.*${BASE_NETWORK.name}`)
				})
			);
			await waitFor(() =>
				expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
			);
			await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);

			await expect(rendered.findByTestId(MODAL_TOKENS_LIST)).resolves.toBeInTheDocument();
			expect(rendered.getByTestId(NETWORK_FILTER)).toHaveTextContent(en.networks.chain_fusion);
		});

		it.each(['pick', 'back', 'missing shortcut'])(
			'should focus the first network and restore receive focus after %s',
			async (action) => {
				const rendered = await setup();

				// The same-network shortcut comes first, so Back must target the other-network one explicitly.
				await expect(
					rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK)
				).resolves.toBeInTheDocument();

				const shortcut = await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK);
				shortcut.focus();
				await fireEvent.click(shortcut);
				const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
				const [firstRow] = within(list).getAllByRole('button');
				await waitFor(() => expect(firstRow).toHaveFocus());

				if (action === 'pick') {
					await fireEvent.click(firstRow);
					await waitFor(() =>
						expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]).toHaveFocus()
					);
				} else {
					const back = rendered.getByRole('button', { name: en.core.text.back });

					if (action === 'missing shortcut') {
						rendered.universe.update((tokens) =>
							tokens.filter(({ network }) => network.id !== ETHEREUM_NETWORK.id)
						);
						await waitFor(() =>
							expect(within(list).getByRole('button', { name: /Solana/ })).toHaveFocus()
						);

						rendered.universe.update((tokens) =>
							tokens.filter(({ network }) => network.id === BASE_NETWORK.id)
						);
						await waitFor(() => expect(back).toHaveFocus());

						const status = within(list).getByRole('status');

						expect(status).toHaveTextContent(en.swap.text.move_networks_changed_title);
						expect(status).toHaveTextContent(
							replacePlaceholders(en.swap.text.move_networks_changed_description, {
								$symbol: BASE_USDC_TOKEN.symbol
							})
						);
					}
					await fireEvent.click(back);
					await waitFor(() =>
						expect(
							rendered.getByTestId(
								action === 'back'
									? SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK
									: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK
							)
						).toHaveFocus()
					);
				}
			}
		);

		it('should use the pay token group ticker in the Move title and empty state', async () => {
			const rendered = await setup({
				...mockValidIcToken,
				symbol: 'ckUSDC',
				groupData: USDC_TOKEN_GROUP
			});
			// The only network is selected directly. Reopen the receive picker to enter Move.
			await fireEvent.click(await rendered.findByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));
			await waitFor(() =>
				expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).toHaveLength(2)
			);
			await fireEvent.click(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]);
			const list = await rendered.findByTestId(SWAP_RECEIVE_NETWORK_LIST);
			const status = list.querySelector(':scope > [role="status"]');

			expect(rendered.getByRole('dialog', { name: 'Move USDC to' })).toBeInTheDocument();
			expect(within(list).getByRole('button', { name: /Ethereum/ })).toBeInTheDocument();
			expect(status).toBeEmptyDOMElement();

			rendered.universe.set([]);

			await waitFor(() => {
				expect(within(list).getByRole('status')).toBe(status);
				expect(status).toHaveTextContent('The available networks changed');
				expect(status).toHaveTextContent(
					'You can no longer receive USDC on another network in this swap. Go back to see what you can receive instead.'
				);
			});
		});

		describe.each([false, true])('token-list focus (desktop: %s)', (desktop) => {
			beforeEach(() => vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(desktop));

			it.each([
				{ shortcut: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK, action: 'back' },
				{ shortcut: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN, action: 'back' },
				{ shortcut: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK, action: 'pick' },
				{ shortcut: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN, action: 'pick' },
				{ shortcut: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN, action: 'missing shortcut' }
			])(
				'should enter $shortcut and restore focus after $action',
				async ({ shortcut: testId, action }) => {
					const rendered = await setup();
					const shortcut = await rendered.findByTestId(testId);
					shortcut.focus();
					await fireEvent.click(shortcut);
					const list = await rendered.findByTestId(MODAL_TOKENS_LIST);
					await waitFor(() => expect(list.contains(document.activeElement)).toBeTruthy());
					if (desktop) {
						expect(within(list).getByRole('textbox')).toHaveFocus();
					} else {
						expect(within(list).getByRole('textbox')).not.toHaveFocus();
					}
					if (action === 'pick') {
						const row = await rendered.findByRole('button', {
							name: new RegExp(`${BASE_ETH_TOKEN.symbol}.*${BASE_NETWORK.name}`)
						});
						row.focus();
						await fireEvent.click(row);
						await waitFor(() =>
							expect(rendered.getAllByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)[1]).toHaveFocus()
						);
					} else {
						if (action === 'missing shortcut') {
							rendered.universe.update((tokens) =>
								tokens.filter(({ network }) => network.id === BASE_NETWORK.id)
							);
						}
						const back = rendered.getByRole('button', { name: en.core.text.back });
						back.focus();
						await fireEvent.click(back);
						await waitFor(() =>
							expect(
								rendered.getByTestId(
									action === 'back' ? testId : SWAP_RECEIVE_SHORTCUT_SAME_NETWORK
								)
							).toHaveFocus()
						);
					}
				}
			);
		});
	});

	it('should display GET_TOKEN step', () => {
		const { getAllByText } = renderGetTokenModal();

		expect(
			getAllByText(
				replacePlaceholders(en.get_token.text.title, {
					$token: ICP_TOKEN.symbol
				})
			)[0]
		).toBeInTheDocument();
	});

	it('should display Swap wizard steps', async () => {
		const { getByTestId } = renderGetTokenModal();
		mockAuthStore();
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

		await fireEvent.click(getByTestId(GET_TOKEN_MODAL_OPEN_SWAP_BUTTON));

		await waitFor(() => {
			expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();
		});
	});
});
