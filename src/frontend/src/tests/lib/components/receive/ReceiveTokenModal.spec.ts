import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import {
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icpAccountIdentifierText } from '$icp/derived/ic.derived';
import * as ckBtcServices from '$icp/services/ckbtc.services';
import * as minterInfoServices from '$icp/services/worker.ck-minter-info.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import ReceiveTokenModal from '$lib/components/receive/ReceiveTokenModal.svelte';
import {
	RECEIVE_ADDRESS_LOADING,
	RECEIVE_CKBTC_DEPOSIT_WARNING,
	RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON,
	RECEIVE_ENABLE_TOKEN_BUTTON,
	RECEIVE_ICP_FORMAT_ACCOUNT_ID,
	RECEIVE_ROUTE_LIST_ITEM,
	RECEIVE_TOKEN_IMPORT_BUTTON,
	RECEIVE_TOKEN_LIST_ITEM,
	RECEIVE_TOKENS_MODAL_ADDRESS_LABEL,
	RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON
} from '$lib/constants/test-ids.constants';
import * as allTokensDerived from '$lib/derived/all-tokens.derived';
import * as networksDerived from '$lib/derived/networks.derived';
import { btcAddressMainnetStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { getReceiveAssetKey, getReceiveRoutes } from '$lib/utils/receive.utils';
import * as tokensUtils from '$lib/utils/tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('ReceiveTokenModal', () => {
	const ckBtcToken = {
		...mockValidIcToken,
		id: parseTokenId('ckBTC'),
		symbol: 'ckBTC',
		name: 'ckBTC',
		network: ICP_NETWORK,
		standard: { code: 'icrc' },
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
		twinToken: BTC_MAINNET_TOKEN,
		enabled: true
	} as IcCkToken & { enabled: boolean };

	const catalog = writable<Token[]>([]);
	const enabledNetworks = writable<Network[]>([]);

	const byTestId = ({ container, testId }: { container: HTMLElement; testId: string }) =>
		container.querySelector<HTMLElement>(`[data-tid="${testId}"]`);

	const routeKeys = (token: Token) =>
		getReceiveRoutes({
			tokens: [token],
			enabledNetworkIds: [ICP_NETWORK.id, BTC_MAINNET_NETWORK.id]
		}).map(({ key }) => key);

	beforeEach(() => {
		vi.restoreAllMocks();

		authStore.setForTesting(mockIdentity);

		catalog.set([ICP_TOKEN, BTC_MAINNET_TOKEN, ckBtcToken, USDC_TOKEN, BASE_USDC_TOKEN]);
		enabledNetworks.set([ICP_NETWORK, BTC_MAINNET_NETWORK, ETHEREUM_NETWORK, BASE_NETWORK]);

		vi.spyOn(allTokensDerived, 'allFungibleTokens', 'get').mockReturnValue(catalog);
		vi.spyOn(networksDerived, 'networks', 'get').mockReturnValue(enabledNetworks);

		vi.spyOn(ckBtcServices, 'loadCkBtcDepositAddress').mockResolvedValue();
		vi.spyOn(minterInfoServices, 'initCkBTCMinterInfoWorker').mockResolvedValue({
			start: vi.fn(),
			stop: vi.fn(),
			trigger: vi.fn(),
			destroy: vi.fn()
		});

		btcAddressMainnetStore.reset();
		btcAddressStore.reinitialize();
		ckBtcMinterInfoStore.reinitialize();
	});

	it('should open All networks on the token list, one entry per verified asset', () => {
		const { container } = render(ReceiveTokenModal);

		expect(
			byTestId({
				container,
				testId: `${RECEIVE_TOKEN_LIST_ITEM}-${getReceiveAssetKey(USDC_TOKEN)}`
			})
		).toBeInTheDocument();
		expect(container.querySelectorAll(`[data-tid^="${RECEIVE_TOKEN_LIST_ITEM}"]`)).toHaveLength(4);
	});

	it('should offer Import token on an empty search', async () => {
		const { container, getByPlaceholderText } = render(ReceiveTokenModal);

		await fireEvent.input(getByPlaceholderText(get(i18n).tokens.placeholder.search_token), {
			target: { value: 'nothing-like-this' }
		});

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_TOKEN_IMPORT_BUTTON })).toBeInTheDocument();
		});
	});

	it('should open native ICP on the Principal and switch everything to the Account ID', async () => {
		const { container } = render(ReceiveTokenModal, { props: { initialToken: ICP_TOKEN } });

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })).toHaveTextContent(
				mockPrincipalText
			);
		});

		expect(container.querySelector('[data-tid="modal-title"]')).toHaveTextContent(
			`Receive ICP on ${ICP_NETWORK.name}`
		);

		const accountIdButton = byTestId({ container, testId: RECEIVE_ICP_FORMAT_ACCOUNT_ID });

		expect(accountIdButton).toHaveAttribute('aria-checked', 'false');

		accountIdButton?.click();

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })).toHaveTextContent(
				get(icpAccountIdentifierText) ?? ''
			);
		});

		expect(accountIdButton).toHaveAttribute('aria-checked', 'true');
	});

	it('should list every network of USDC with the page network first', async () => {
		const { container } = render(ReceiveTokenModal, {
			props: { initialToken: BASE_USDC_TOKEN, preferredNetworkId: BASE_NETWORK.id }
		});

		await waitFor(() => {
			expect(container.querySelectorAll(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"]`)).toHaveLength(
				2
			);
		});

		const titles = [
			...container.querySelectorAll(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"] .logo-button-title`)
		].map((el) => el.textContent?.trim());

		expect(titles).toEqual([BASE_NETWORK.name, ETHEREUM_NETWORK.name]);
	});

	it('should offer BTC as ckBTC, saying what it means in its row', async () => {
		ckBtcMinterInfoStore.set({
			id: ckBtcToken.id,
			data: { data: mockCkBtcMinterInfo, certified: true }
		});

		const { container } = render(ReceiveTokenModal, { props: { initialToken: BTC_MAINNET_TOKEN } });

		await waitFor(() => {
			expect(container.querySelectorAll(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"]`)).toHaveLength(
				2
			);
		});

		expect(container.querySelector('[data-tid="modal-title"]')).toHaveTextContent('Receive BTC');
		expect(container).toHaveTextContent(
			get(i18n).receive.ckbtc.text.receive_as.replace('$token', 'ckBTC')
		);
		expect(container).toHaveTextContent(
			get(i18n).receive.ckbtc.text.benefit.replace(
				'$count',
				`${mockCkBtcMinterInfo.min_confirmations}`
			)
		);
		expect(
			byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })
		).not.toBeInTheDocument();
	});

	it('should not show an uncertified Bitcoin address', async () => {
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });

		const { container } = render(ReceiveTokenModal, { props: { initialToken: BTC_MAINNET_TOKEN } });

		const [direct] = routeKeys(BTC_MAINNET_TOKEN);

		await waitFor(() => {
			expect(
				byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })
			).toBeInTheDocument();
		});

		byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })?.click();

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_ADDRESS_LOADING })).toBeInTheDocument();
		});

		expect(
			byTestId({ container, testId: RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON })
		).not.toBeInTheDocument();

		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: true });

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })).toHaveTextContent(
				mockBtcAddress
			);
		});
	});

	describe('ckBTC', () => {
		it('should offer the direct and the Bitcoin deposit routes', async () => {
			const { container } = render(ReceiveTokenModal, { props: { initialToken: ckBtcToken } });

			const [direct, deposit] = routeKeys(ckBtcToken);

			await waitFor(() => {
				expect(
					byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })
				).toBeInTheDocument();
				expect(
					byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${deposit}` })
				).toHaveTextContent(
					get(i18n)
						.receive.token.text.route_ckbtc_deposit.replace('$sourceToken', 'BTC')
						.replace('$creditedToken', 'ckBTC')
				);
			});
		});

		it('should show the deposit address with its warning, terms and activity link', async () => {
			const depositAddress = 'bc1qdepositaddressforckbtc';

			const { container } = render(ReceiveTokenModal, { props: { initialToken: ckBtcToken } });

			const [, deposit] = routeKeys(ckBtcToken);

			await waitFor(() => {
				expect(
					byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${deposit}` })
				).toBeInTheDocument();
			});

			byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${deposit}` })?.click();

			await waitFor(() => {
				expect(byTestId({ container, testId: RECEIVE_ADDRESS_LOADING })).toBeInTheDocument();
			});

			expect(ckBtcServices.loadCkBtcDepositAddress).toHaveBeenCalledOnce();
			expect(
				byTestId({ container, testId: RECEIVE_CKBTC_DEPOSIT_WARNING })
			).not.toBeInTheDocument();
			expect(
				byTestId({ container, testId: RECEIVE_TOKENS_MODAL_COPY_ADDRESS_BUTTON })
			).not.toBeInTheDocument();
			expect(
				byTestId({ container, testId: RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON })
			).not.toBeInTheDocument();

			btcAddressStore.set({ id: ckBtcToken.id, data: { data: depositAddress, certified: true } });
			ckBtcMinterInfoStore.set({
				id: ckBtcToken.id,
				data: { data: mockCkBtcMinterInfo, certified: true }
			});

			await waitFor(() => {
				expect(
					byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })
				).toHaveTextContent(depositAddress);
			});

			expect(container).toHaveTextContent(get(i18n).receive.ckbtc.text.deposit_address);
			expect(byTestId({ container, testId: RECEIVE_CKBTC_DEPOSIT_WARNING })).toHaveTextContent(
				get(i18n).receive.ckbtc.text.deposit_warning
			);
			expect(container).toHaveTextContent(`${mockCkBtcMinterInfo.min_confirmations}`);
			expect(
				byTestId({ container, testId: RECEIVE_CKBTC_VIEW_ACTIVITY_BUTTON })
			).toBeInTheDocument();
		});

		it('should return focus to the route the person left with Back', async () => {
			const { container, getByRole } = render(ReceiveTokenModal, {
				props: { initialToken: ckBtcToken }
			});

			const [, deposit] = routeKeys(ckBtcToken);
			const depositSelector = `[data-tid="${RECEIVE_ROUTE_LIST_ITEM}-${deposit}"]`;

			await waitFor(() => {
				expect(container.querySelector(depositSelector)).toBeInTheDocument();
			});

			container.querySelector<HTMLElement>(depositSelector)?.click();

			await waitFor(() => {
				expect(getByRole('button', { name: get(i18n).core.text.back })).toBeInTheDocument();
			});

			getByRole('button', { name: get(i18n).core.text.back }).click();

			await waitFor(() => {
				expect(document.activeElement).toBe(container.querySelector(depositSelector));
			});

			expect(container.querySelector(depositSelector)).toHaveAttribute('aria-pressed', 'true');
		});

		it('should show unavailable terms with a retry while the direct route stays usable', async () => {
			ckBtcMinterInfoStore.reset(ckBtcToken.id);

			const { container } = render(ReceiveTokenModal, { props: { initialToken: ckBtcToken } });

			const [direct, deposit] = routeKeys(ckBtcToken);

			await waitFor(() => {
				expect(
					byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${deposit}` })
				).toBeInTheDocument();
			});

			byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${deposit}` })?.click();

			await waitFor(() => {
				expect(container).toHaveTextContent(get(i18n).receive.ckbtc.text.terms_error);
			});

			expect(
				byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })
			).not.toBeInTheDocument();
		});

		it('should ask to enable a disabled ckBTC before showing any address, and enable only it', async () => {
			catalog.set([{ ...ckBtcToken, enabled: false } as Token, BTC_MAINNET_TOKEN]);

			const saveSpy = vi.spyOn(tokensUtils, 'saveAllCustomTokens').mockResolvedValue();

			const { container } = render(ReceiveTokenModal, { props: { initialToken: ckBtcToken } });

			const [direct] = routeKeys(ckBtcToken);

			await waitFor(() => {
				expect(
					byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })
				).toBeInTheDocument();
			});

			byTestId({ container, testId: `${RECEIVE_ROUTE_LIST_ITEM}-${direct}` })?.click();

			await waitFor(() => {
				expect(byTestId({ container, testId: RECEIVE_ENABLE_TOKEN_BUTTON })).toBeInTheDocument();
			});

			expect(
				byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })
			).not.toBeInTheDocument();

			byTestId({ container, testId: RECEIVE_ENABLE_TOKEN_BUTTON })?.click();

			await waitFor(() => {
				expect(saveSpy).toHaveBeenCalledOnce();
			});

			const [[{ tokens }]] = saveSpy.mock.calls;

			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				enabled: true
			});

			// The reload brings ckBTC back enabled, under a new TokenId: the route resolves to it.
			catalog.set([{ ...ckBtcToken, id: parseTokenId('ckBTC'), enabled: true } as Token]);

			await waitFor(() => {
				expect(
					byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })
				).toHaveTextContent(mockPrincipalText);
			});
		});
	});

	it('should send the person back to choose when the open route becomes unavailable', async () => {
		const { container } = render(ReceiveTokenModal, {
			props: { initialToken: BASE_USDC_TOKEN, preferredNetworkId: BASE_NETWORK.id }
		});

		await waitFor(() => {
			expect(container.querySelectorAll(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"]`)).toHaveLength(
				2
			);
		});

		container.querySelector<HTMLElement>(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"]`)?.click();

		await waitFor(() => {
			expect(byTestId({ container, testId: RECEIVE_ADDRESS_LOADING })).toBeInTheDocument();
		});

		enabledNetworks.set([ICP_NETWORK, ETHEREUM_NETWORK]);

		await waitFor(() => {
			expect(container.querySelectorAll(`[data-tid^="${RECEIVE_ROUTE_LIST_ITEM}"]`)).toHaveLength(
				1
			);
		});

		expect(
			byTestId({ container, testId: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL })
		).not.toBeInTheDocument();
	});
});
