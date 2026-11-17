import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
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
import * as deviceUtils from '$lib/utils/device.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

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

		const setup = async () => {
			const swapContext = {
				...initSwapContext({ sourceToken: BASE_USDC_TOKEN }),
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
			mockContext.set(
				MODAL_NETWORKS_LIST_CONTEXT_KEY,
				initModalNetworksListContext({
					networks: [BASE_NETWORK, ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK]
				})
			);
			const universe = writable(
				[
					BASE_USDC_TOKEN,
					BASE_ETH_TOKEN,
					ETHEREUM_TOKEN,
					ETHEREUM_USDC_TOKEN,
					SOLANA_USDC_TOKEN
				].map((token) => ({ ...token, enabled: true }))
			);
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(universe);
			vi.spyOn(crossChainNetworksDerived, 'crossChainSwapNetworksMainnets', 'get').mockReturnValue(
				readable([BASE_NETWORK, ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK])
			);
			vi.spyOn(networksDerived, 'networks', 'get').mockReturnValue(
				readable([BASE_NETWORK, ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK])
			);

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
			return { ...rendered, universe };
		};

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
					if (action === 'missing shortcut') {
						rendered.universe.update((tokens) =>
							tokens.filter(({ network }) => network.id === BASE_NETWORK.id)
						);
					}
					await fireEvent.click(rendered.getByText(en.core.text.back));
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
