import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as icAddCustomTokensService from '$icp/services/ic-add-custom-tokens.service';
import { loadCustomTokens } from '$icp/services/icrc.services';
import * as backendApi from '$lib/api/backend.api';
import * as idbTokensApi from '$lib/api/idb-tokens.api';
import TokenModal from '$lib/components/tokens/TokenModal.svelte';
import {
	TOKEN_MODAL_CONTENT_DELETE_BUTTON,
	TOKEN_MODAL_DELETE_BUTTON,
	TOKEN_MODAL_INDEX_CANISTER_ID_EDIT_BUTTON,
	TOKEN_MODAL_INDEX_CANISTER_ID_INPUT,
	TOKEN_MODAL_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import * as authServices from '$lib/services/auth.services';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import * as navUtils from '$lib/utils/nav.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { MOCK_CANISTER_ID_1 } from '$tests/mocks/exchanges.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$icp/services/icrc.services', () => ({
	loadCustomTokens: vi.fn()
}));

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('TokenModal', () => {
	const mockRemoveUserToken = () =>
		vi.spyOn(backendApi, 'removeUserToken').mockResolvedValue(undefined);
	const mockSetCustomToken = () =>
		vi.spyOn(backendApi, 'setCustomToken').mockResolvedValue(undefined);
	const mockIdbTokensApi = () =>
		vi.spyOn(idbTokensApi, 'deleteIdbEthTokenDeprecated').mockResolvedValue(undefined);
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

		const removeUserTokenMock = mockRemoveUserToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		const idbTokensApi = mockIdbTokensApi();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeUserTokenMock).toHaveBeenCalledOnce();
		expect(toasts).toHaveBeenCalledOnce();
		expect(idbTokensApi).toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).toHaveBeenCalledOnce();
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

		expect(setCustomTokenMock).toHaveBeenCalledOnce();
		expect(setCustomTokenMock).toHaveBeenCalledWith({
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

		expect(setCustomTokenMock).toHaveBeenCalledOnce();
		expect(setCustomTokenMock).toHaveBeenCalledWith({
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

		const removeUserTokenMock = mockRemoveUserToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		const idbTokensApi = mockIdbTokensApi();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeUserTokenMock).not.toHaveBeenCalledOnce();
		expect(toasts).not.toHaveBeenCalledOnce();
		expect(idbTokensApi).not.toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
	});

	it('does not delete token if authIdentity is not available', async () => {
		const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();
		const { getByTestId, getByText, getAllByText } = render(TokenModal, {
			props: {
				token: {
					...mockValidErc20Token,
					enabled: true
				} as Token,
				isDeletable: true
			}
		});

		const removeUserTokenMock = mockRemoveUserToken();
		const toasts = mockToastsShow();
		const gotoReplaceRoot = mockGoToRoot();
		const idbTokensApi = mockIdbTokensApi();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeUserTokenMock).not.toHaveBeenCalledOnce();
		expect(toasts).not.toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
		expect(idbTokensApi).not.toHaveBeenCalledOnce();
		expect(signOutSpy).toHaveBeenCalledOnce();
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

		const removeUserTokenMock = vi
			.spyOn(backendApi, 'removeUserToken')
			.mockRejectedValue(new Error('test'));
		const toastsError = mockToastsError();
		const gotoReplaceRoot = mockGoToRoot();
		const idbTokensApi = mockIdbTokensApi();
		mockAuthStore();

		expect(getByText(en.tokens.details.title)).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_CONTENT_DELETE_BUTTON));

		expect(getAllByText(en.tokens.text.delete_token)[0]).toBeInTheDocument();

		await fireEvent.click(getByTestId(TOKEN_MODAL_DELETE_BUTTON));

		expect(removeUserTokenMock).toHaveBeenCalledOnce();
		expect(toastsError).toHaveBeenCalledOnce();
		expect(gotoReplaceRoot).not.toHaveBeenCalledOnce();
		expect(idbTokensApi).not.toHaveBeenCalledOnce();
	});
});
