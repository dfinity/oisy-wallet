import IcUnavailableTokens from '$icp/components/tokens/IcUnavailableTokens.svelte';
import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import * as backendApi from '$lib/api/backend.api';
import {
	MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE,
	MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE,
	MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS
} from '$lib/constants/test-ids.constants';
import * as toastsStore from '$lib/stores/toasts.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import * as idbKeyval from 'idb-keyval';
import { get } from 'svelte/store';

describe('IcUnavailableTokens', () => {
	const mockUnavailableToken = (ledgerCanisterId: string): IcrcUnavailableCustomToken => ({
		ledgerCanisterId,
		customToken: {
			token: {
				Icrc: {
					ledger_id: Principal.fromText(ledgerCanisterId),
					index_id: toNullable()
				}
			},
			version: toNullable(1n),
			enabled: true,
			section: toNullable(),
			allow_external_content_source: toNullable(),
			allowed_external_content_source_urls: toNullable()
		}
	});

	const importedToken = mockUnavailableToken('aiw2p-tyaaa-aaaam-aebyq-cai');

	const curatedToken: IcrcUnavailableCustomToken = {
		...mockUnavailableToken('bw4dl-smaaa-aaaaa-qaacq-cai'),
		symbol: 'TST'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		icrcUnavailableCustomTokensStore.set([]);

		mockAuthStore();
	});

	it('should render nothing when every saved token loads', () => {
		const { queryByTestId } = render(IcUnavailableTokens);

		expect(queryByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS)).not.toBeInTheDocument();
	});

	it('should list each unavailable token by its symbol, or else by its ledger canister ID', () => {
		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getByTestId, getAllByTestId } = render(IcUnavailableTokens);

		const section = getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKENS);

		expect(section).toHaveTextContent(en.tokens.manage.text.unavailable_tokens);
		expect(section).toHaveTextContent(
			replaceOisyPlaceholders(en.tokens.manage.info.unavailable_tokens)
		);
		expect(section).toHaveTextContent(importedToken.ledgerCanisterId);
		expect(section).toHaveTextContent('TST');
		expect(section).not.toHaveTextContent(curatedToken.ledgerCanisterId);

		expect(getAllByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE)).toHaveLength(2);
	});

	it('should ask for confirmation and delete nothing when cancelled', async () => {
		const removeCustomTokenMock = vi.spyOn(backendApi, 'removeCustomToken');

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId, getByText, queryByTestId } = render(IcUnavailableTokens);

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE));

		expect(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE)).toBeInTheDocument();

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(
			queryByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE)
		).not.toBeInTheDocument();
		expect(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE)).toBeInTheDocument();

		expect(removeCustomTokenMock).not.toHaveBeenCalled();
		expect(get(icrcUnavailableCustomTokensStore)).toEqual([importedToken]);
	});

	it('should delete the saved token, its cached copy and its row', async () => {
		const removeCustomTokenMock = vi
			.spyOn(backendApi, 'removeCustomToken')
			.mockResolvedValue(undefined);
		const toastsShowMock = vi.spyOn(toastsStore, 'toastsShow').mockImplementation(vi.fn());

		vi.mocked(idbKeyval.get).mockResolvedValue([
			importedToken.customToken,
			curatedToken.customToken
		]);

		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getAllByTestId, getByTestId } = render(IcUnavailableTokens);

		const [deleteImportedToken] = getAllByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE);

		await fireEvent.click(deleteImportedToken);

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE));

		await waitFor(() => {
			expect(get(icrcUnavailableCustomTokensStore)).toEqual([curatedToken]);
		});

		expect(removeCustomTokenMock).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			token: importedToken.customToken
		});

		expect(idbKeyval.set).toHaveBeenCalledExactlyOnceWith(
			mockIdentity.getPrincipal().toText(),
			[curatedToken.customToken],
			expect.anything()
		);

		expect(toastsShowMock).toHaveBeenCalledExactlyOnceWith({
			text: replacePlaceholders(replaceOisyPlaceholders(en.tokens.details.deletion_confirmation), {
				$token: importedToken.ledgerCanisterId
			}),
			level: 'success',
			duration: 2000
		});
	});

	it('should keep the token and show an error when deleting fails', async () => {
		const err = new Error('test');

		vi.spyOn(backendApi, 'removeCustomToken').mockRejectedValue(err);
		const toastsErrorMock = vi.spyOn(toastsStore, 'toastsError').mockImplementation(vi.fn());

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(IcUnavailableTokens);

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE));

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE));

		await waitFor(() => {
			expect(toastsErrorMock).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.tokens.error.unexpected_error_on_token_delete },
				err
			});
		});

		expect(idbKeyval.set).not.toHaveBeenCalled();
		expect(get(icrcUnavailableCustomTokensStore)).toEqual([importedToken]);
	});

	it('should delete nothing without a signed-in identity', async () => {
		mockAuthStore(null);

		const removeCustomTokenMock = vi.spyOn(backendApi, 'removeCustomToken');

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(IcUnavailableTokens);

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_DELETE));

		await fireEvent.click(getByTestId(MANAGE_TOKENS_IC_UNAVAILABLE_TOKEN_CONFIRM_DELETE));

		expect(removeCustomTokenMock).not.toHaveBeenCalled();
		expect(get(icrcUnavailableCustomTokensStore)).toEqual([importedToken]);
	});
});
