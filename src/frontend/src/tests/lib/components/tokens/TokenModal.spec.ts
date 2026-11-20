import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import * as icAddCustomTokensService from '$icp/services/ic-add-custom-tokens.service';
import { loadCustomTokens } from '$icp/services/icrc.services';
import * as backendApi from '$lib/api/backend.api';
import TokenModal from '$lib/components/tokens/TokenModal.svelte';
import {
	TOKEN_MODAL_CONTENT_DELETE_BUTTON,
	TOKEN_MODAL_DELETE_BUTTON,
	TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON,
	TOKEN_MODAL_INDEX_CANISTER_ID_INPUT,
	TOKEN_MODAL_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import * as navUtils from '$lib/utils/nav.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { MOCK_CANISTER_ID_1 } from '$tests/mocks/exchanges.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import * as xrpRemoveTokenServices from '$xrp/services/xrp-remove-token.services';
import * as xrpTrustLineTokensServices from '$xrp/services/xrp-trust-line-tokens.services';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('$icp/services/icrc.services', () => ({
	loadCustomTokens: vi.fn()
}));

describe('TokenModal', () => {
	const mockRemoveCustomToken = () =>
		vi.spyOn(backendApi, 'removeCustomToken').mockResolvedValue(undefined);
	const mockSetCustomToken = () =>
		vi.spyOn(backendApi, 'setCustomToken').mockResolvedValue(undefined);
	const mockIcAddCustomTokensService = (result = true) =>
		vi.spyOn(icAddCustomTokensService, 'assertIndexLedgerId').mockResolvedValue({ valid: result });
	const mockToastsShow = () => vi.spyOn(toastsStore, 'toastsShow').mockImplementation(vi.fn());
	const mockToastsError = () => vi.spyOn(toastsStore, 'toastsError').mockImplementation(vi.fn());
	const mockGoToRoot = () => vi.spyOn(navUtils, 'gotoReplaceRoot').mockImplementation(vi.fn());
	const mockIcToken = {
		...mockValidIcrcToken,
		minterCanisterId: 'random id',
		twinToken: mockValidIcrcToken
	};

	beforeEach(() => {
		vi.resetAllMocks();
		modalStore.close();
		mockPage.reset();
	});

	it('deletes token after all required steps', async () => {
		const { getByTestId, getByText, getAllByText } = render(TokenModal, {
			props: {
				token: {
					...mockValidErc20Token,
					enabled: true
				} as Token,
				isDeletable: true
			}
		});

		const removeCustomTokenMock = mockRemoveCustomToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		await waitFor(() => {
			expect(removeCustomTokenMock).toHaveBeenCalledOnce();
			expect(toasts).toHaveBeenCalledOnce();
			expect(gotoReplaceRoot).toHaveBeenCalledOnce();
		});
	});

	it('deletes an ERC4626 token after all required steps', async () => {
		const token: Erc4626CustomToken = { ...mockValidErc4626Token, enabled: true };
		const cachedToken = toCustomToken({
			...token,
			chainId: token.network.chainId,
			networkKey: 'Erc4626'
		});
		const otherCachedToken = toCustomToken({
			...mockValidErc20Token,
			chainId: mockValidErc20Token.network.chainId,
			enabled: true,
			networkKey: 'Erc20'
		});

		erc4626CustomTokensStore.resetAll();
		erc4626CustomTokensStore.setAll([{ data: token, certified: true }]);
		vi.mocked(idbKeyval.get).mockResolvedValue([cachedToken, otherCachedToken]);

		const { getByTestId } = render(TokenModal, {
			props: {
				token,
				isDeletable: true
			}
		});

		const removeCustomTokenMock = mockRemoveCustomToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		mockAuthStore();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		await waitFor(() => {
			expect(removeCustomTokenMock).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token: expect.objectContaining({
					token: {
						Erc4626: {
							token_address: mockValidErc4626Token.address,
							chain_id: mockValidErc4626Token.network.chainId
						}
					}
				})
			});
			expect(toasts).toHaveBeenCalledOnce();
			expect(gotoReplaceRoot).toHaveBeenCalledOnce();
		});

		expect(get(erc4626CustomTokensStore)).toEqual([]);
		expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
			mockIdentity.getPrincipal().toText(),
			[otherCachedToken],
			expect.anything()
		);
	});

	it('saves token after all required steps if indexCanisterId was missing', async () => {
		const { getByTestId, getByText } = render(TokenModal, {
			props: {
				token: {
					...mockIcToken,
					enabled: true
				} as Token,
				isEditable: true
			}
		});

		const setCustomTokenMock = mockSetCustomToken();
		mockIcAddCustomTokensService();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByText(en.tokens.details.missing_index_canister_id_button));

		await fireEvent.input(getByTestId(TOKEN_MODAL_INDEX_CANISTER_ID_INPUT), {
			target: { value: MOCK_CANISTER_ID_1 }
		});

		await fireEvent.click(getByTestId(TOKEN_MODAL_SAVE_BUTTON));

		expect(setCustomTokenMock).toHaveBeenCalledExactlyOnceWith({
			token: toCustomToken({
				indexCanisterId: MOCK_CANISTER_ID_1,
				ledgerCanisterId: mockIcToken.ledgerCanisterId,
				enabled: true,
				networkKey: 'Icrc'
			}),
			identity: mockIdentity
		});
		expect(loadCustomTokens).toHaveBeenCalledOnce();
	});

	it('saves token after all required steps if indexCanisterId was present', async () => {
		const { getByTestId, getByText } = render(TokenModal, {
			props: {
				token: {
					...mockIcToken,
					indexCanisterId: 'test',
					enabled: true
				} as Token,
				isEditable: true
			}
		});

		const setCustomTokenMock = mockSetCustomToken();
		mockAuthStore();
		mockIcAddCustomTokensService();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON));

		await fireEvent.input(getByTestId(TOKEN_MODAL_INDEX_CANISTER_ID_INPUT), {
			target: { value: '' }
		});

		await fireEvent.click(getByTestId(TOKEN_MODAL_SAVE_BUTTON));

		expect(setCustomTokenMock).toHaveBeenCalledExactlyOnceWith({
			token: toCustomToken({
				ledgerCanisterId: mockIcToken.ledgerCanisterId,
				enabled: true,
				networkKey: 'Icrc'
			}),
			identity: mockIdentity
		});
		expect(loadCustomTokens).toHaveBeenCalledOnce();
	});

	it('does not save token if indexCanisterId assertion failed', async () => {
		const { getByTestId, getByText } = render(TokenModal, {
			props: {
				token: {
					...mockIcToken,
					indexCanisterId: 'test',
					enabled: true
				} as Token,
				isEditable: true
			}
		});

		const setCustomTokenMock = mockSetCustomToken();
		mockAuthStore();
		mockIcAddCustomTokensService(false);

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON));

		await fireEvent.input(getByTestId(TOKEN_MODAL_INDEX_CANISTER_ID_INPUT), {
			target: { value: MOCK_CANISTER_ID_1 }
		});

		await fireEvent.click(getByTestId(TOKEN_MODAL_SAVE_BUTTON));

		expect(setCustomTokenMock).not.toHaveBeenCalledOnce();
		expect(loadCustomTokens).not.toHaveBeenCalledOnce();
	});

	it('does not delete token if it is not erc20', async () => {
		const { getByTestId, getByText, getAllByText } = render(TokenModal, {
			props: {
				token: ICP_TOKEN,
				isDeletable: true
			}
		});

		const removeCustomTokenMock = mockRemoveCustomToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeCustomTokenMock).not.toHaveBeenCalledOnce();
		expect(toasts).not.toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
	});

	it('does not delete token if authIdentity is not available', async () => {
		const { getByTestId, getByText, getAllByText } = render(TokenModal, {
			props: {
				token: {
					...mockValidErc20Token,
					enabled: true
				} as Token,
				isDeletable: true
			}
		});

		const removeCustomTokenMock = mockRemoveCustomToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeCustomTokenMock).not.toHaveBeenCalledOnce();
		expect(toasts).not.toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
	});

	it('does not find delete button if token is not deletable', () => {
		const { getByTestId } = render(TokenModal, {
			props: {
				token: ICP_TOKEN
			}
		});

		expect(() => getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON)).toThrow();
	});

	it('handles an error on token delete correctly', async () => {
		const { getByTestId, getByText, getAllByText } = render(TokenModal, {
			props: {
				token: {
					...mockValidErc20Token,
					enabled: true
				} as Token,
				isDeletable: true
			}
		});

		const removeCustomTokenMock = vi
			.spyOn(backendApi, 'removeCustomToken')
			.mockRejectedValue(new Error('test'));
		const toastsError = mockToastsError();
		const gotoReplaceRoot = mockGoToRoot();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeCustomTokenMock).toHaveBeenCalledOnce();
		expect(toastsError).toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
	});

	// Removing one is a transaction on the XRP Ledger: its confirmation shows the fee, and the backend
	// entry goes once the ledger has deleted the line, not here.
	describe('an XRP Ledger trust-line token', () => {
		const token = { ...RLUSD_TOKEN, enabled: true };

		const openConfirmation = async () => {
			const rendered = render(TokenModal, { props: { token, isDeletable: true } });

			await fireEvent.click(rendered.getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

			await waitFor(() =>
				expect(rendered.getByTestId(TOKEN_MODAL_DELETE_BUTTON)).not.toBeDisabled()
			);

			return rendered;
		};

		beforeEach(() => {
			mockAuthStore();
			xrpAddressMainnetStore.set({ certified: true, data: mockXrpAddress });

			vi.spyOn(xrpRemoveTokenServices, 'loadXrpRemoveTokenReview').mockResolvedValue({
				review: { fee: 12n }
			});
		});

		afterEach(() => {
			xrpAddressMainnetStore.reset();
		});

		it('confirms the removal with what it costs and releases', async () => {
			vi.spyOn(xrpTrustLineTokensServices, 'removeXrpTrustLineToken').mockResolvedValue();

			const { getByText } = await openConfirmation();

			expect(
				getByText(en.tokens.import.text.xrp_remove_description.replace('$symbol', 'RLUSD'))
			).toBeInTheDocument();
			expect(
				getByText(en.tokens.import.text.xrp_remove_reserve.replace('$amount', '0.2'))
			).toBeInTheDocument();
		});

		it('removes it with the fee its confirmation showed, then closes', async () => {
			const remove = vi
				.spyOn(xrpTrustLineTokensServices, 'removeXrpTrustLineToken')
				.mockImplementation(async ({ onSuccess }) => {
					await onSuccess?.();
				});
			const removeCustomTokenMock = mockRemoveCustomToken();
			const gotoReplaceRoot = mockGoToRoot();

			const { getByTestId } = await openConfirmation();

			await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

			await waitFor(() => expect(gotoReplaceRoot).toHaveBeenCalledOnce());

			expect(remove).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				source: mockXrpAddress,
				token,
				fee: 12n,
				onSuccess: expect.any(Function),
				onError: expect.any(Function)
			});
			expect(removeCustomTokenMock).not.toHaveBeenCalled();
		});

		it('goes back to the token when the removal is refused', async () => {
			vi.spyOn(xrpTrustLineTokensServices, 'removeXrpTrustLineToken').mockImplementation(
				({ onError }) => {
					onError?.(new Error('refused'));
					return Promise.resolve();
				}
			);
			const gotoReplaceRoot = mockGoToRoot();

			const { getByTestId, getByText } = await openConfirmation();

			await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

			await waitFor(() => expect(getByText(en.tokens.details.title)).toBeInTheDocument());

			expect(gotoReplaceRoot).not.toHaveBeenCalled();
		});

		// The confirmation said why already; there is nothing to send.
		it('goes back to the token when the removal cannot be reviewed', async () => {
			vi.spyOn(xrpRemoveTokenServices, 'loadXrpRemoveTokenReview').mockResolvedValue({
				refusal: 'balance_not_zero'
			});
			const remove = vi.spyOn(xrpTrustLineTokensServices, 'removeXrpTrustLineToken');
			mockToastsError();

			const { getByTestId, getByText } = render(TokenModal, {
				props: { token, isDeletable: true }
			});

			await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

			await waitFor(() => expect(getByText(en.tokens.details.title)).toBeInTheDocument());

			expect(remove).not.toHaveBeenCalled();
		});
	});
});
