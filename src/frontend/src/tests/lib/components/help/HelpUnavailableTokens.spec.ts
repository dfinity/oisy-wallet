import { checkIcrcLedgerStatus } from '$icp/services/icrc-ledger-status.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import type { IcrcLedgerStatus, IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import * as backendApi from '$lib/api/backend.api';
import HelpUnavailableTokens from '$lib/components/help/HelpUnavailableTokens.svelte';
import {
	HELP_UNAVAILABLE_TOKENS_CARD,
	HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON,
	HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON,
	HELP_UNAVAILABLE_TOKENS_STATUS
} from '$lib/constants/test-ids.constants';
import * as toastsStore from '$lib/stores/toasts.store';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import * as idbKeyval from 'idb-keyval';
import { tick } from 'svelte';
import { get } from 'svelte/store';

vi.mock('$icp/services/icrc-ledger-status.services', () => ({
	checkIcrcLedgerStatus: vi.fn()
}));

describe('HelpUnavailableTokens', () => {
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

		icrcCustomTokensStore.resetAll();
		icrcUnavailableCustomTokensStore.reset();

		mockAuthStore();

		vi.mocked(checkIcrcLedgerStatus).mockResolvedValue({ status: 'no_ledger' });
	});

	const statusOf = ({ ledgerCanisterId }: IcrcUnavailableCustomToken): string =>
		`${HELP_UNAVAILABLE_TOKENS_STATUS}-${ledgerCanisterId}`;

	it('should render nothing when every saved token loads', () => {
		const { queryByTestId } = render(HelpUnavailableTokens);

		expect(queryByTestId(HELP_UNAVAILABLE_TOKENS_CARD)).not.toBeInTheDocument();
	});

	it('should list each unavailable token by its symbol, or else by its ledger canister ID', () => {
		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getByTestId, getAllByTestId } = render(HelpUnavailableTokens);

		const card = getByTestId(HELP_UNAVAILABLE_TOKENS_CARD);

		expect(card).toHaveTextContent(en.help.text.unavailable_tokens_title);
		expect(card).toHaveTextContent(
			replaceOisyPlaceholders(en.help.text.unavailable_tokens_description)
		);
		expect(card).toHaveTextContent(importedToken.ledgerCanisterId);
		expect(card).toHaveTextContent('TST');
		expect(card).not.toHaveTextContent(curatedToken.ledgerCanisterId);

		expect(getAllByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON)).toHaveLength(2);
	});

	it('should show the name too when it says more than the symbol', () => {
		icrcUnavailableCustomTokensStore.set([{ ...curatedToken, name: 'Test Token' }]);

		const { getByTestId } = render(HelpUnavailableTokens);

		expect(getByTestId(HELP_UNAVAILABLE_TOKENS_CARD)).toHaveTextContent('Test Token (TST)');
	});

	it('should show the symbol once when the name repeats it', () => {
		icrcUnavailableCustomTokensStore.set([{ ...curatedToken, name: 'TST' }]);

		const { getByTestId } = render(HelpUnavailableTokens);

		expect(getByTestId(HELP_UNAVAILABLE_TOKENS_CARD)).not.toHaveTextContent('TST (TST)');
	});

	it('should check each listed ledger and show what it answered', async () => {
		vi.mocked(checkIcrcLedgerStatus).mockImplementation(({ ledgerCanisterId }) =>
			Promise.resolve(
				ledgerCanisterId === importedToken.ledgerCanisterId
					? { status: 'error', errorCode: 'IC0536' }
					: { status: 'no_ledger' }
			)
		);

		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await waitFor(() => {
			expect(getByTestId(statusOf(importedToken))).toHaveTextContent(
				`${en.help.text.unavailable_tokens_error} (IC0536)`
			);
		});

		expect(getByTestId(statusOf(curatedToken))).toHaveTextContent(
			en.help.text.unavailable_tokens_no_ledger
		);

		expect(checkIcrcLedgerStatus).toHaveBeenCalledTimes(2);
		expect(checkIcrcLedgerStatus).toHaveBeenCalledWith({
			identity: mockIdentity,
			ledgerCanisterId: importedToken.ledgerCanisterId
		});
		expect(checkIcrcLedgerStatus).toHaveBeenCalledWith({
			identity: mockIdentity,
			ledgerCanisterId: curatedToken.ledgerCanisterId
		});
	});

	it('should not check a ledger again when the list changes', async () => {
		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await waitFor(() => {
			expect(getByTestId(statusOf(curatedToken))).toHaveTextContent(
				en.help.text.unavailable_tokens_no_ledger
			);
		});

		icrcUnavailableCustomTokensStore.set([curatedToken]);

		await waitFor(() => {
			expect(getByTestId(HELP_UNAVAILABLE_TOKENS_CARD)).not.toHaveTextContent(
				importedToken.ledgerCanisterId
			);
		});

		expect(checkIcrcLedgerStatus).toHaveBeenCalledTimes(2);
	});

	it('should show that a ledger is being checked', async () => {
		vi.mocked(checkIcrcLedgerStatus).mockReturnValue(new Promise(() => {}));

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await waitFor(() => {
			expect(getByTestId(statusOf(importedToken))).toHaveTextContent(
				en.help.text.unavailable_tokens_checking
			);
		});
	});

	it.each<{ ledgerStatus: IcrcLedgerStatus; text: string }>([
		{ ledgerStatus: { status: 'responding' }, text: en.help.text.unavailable_tokens_responding },
		{
			ledgerStatus: { status: 'not_responding' },
			text: en.help.text.unavailable_tokens_not_responding
		},
		{ ledgerStatus: { status: 'error' }, text: en.help.text.unavailable_tokens_error }
	])('should show the status $ledgerStatus.status', async ({ ledgerStatus, text }) => {
		vi.mocked(checkIcrcLedgerStatus).mockResolvedValue(ledgerStatus);

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await waitFor(() => {
			expect(getByTestId(statusOf(importedToken))).toHaveTextContent(text);
		});
	});

	it('should show an error when the check itself fails', async () => {
		vi.mocked(checkIcrcLedgerStatus).mockRejectedValue(new Error('test'));

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await waitFor(() => {
			expect(getByTestId(statusOf(importedToken))).toHaveTextContent(
				en.help.text.unavailable_tokens_error
			);
		});
	});

	it('should not check a ledger without a signed-in identity', () => {
		mockAuthStore(null);

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { queryByTestId } = render(HelpUnavailableTokens);

		expect(checkIcrcLedgerStatus).not.toHaveBeenCalled();
		expect(queryByTestId(statusOf(importedToken))).not.toBeInTheDocument();
	});

	it('should ask for confirmation and delete nothing when cancelled', async () => {
		const removeCustomTokenMock = vi.spyOn(backendApi, 'removeCustomToken');

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId, getByText, queryByTestId } = render(HelpUnavailableTokens);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON));

		expect(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON)).toBeInTheDocument();

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(queryByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON)).not.toBeInTheDocument();
		expect(getByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON)).toBeInTheDocument();

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

		const { getAllByTestId, getByTestId } = render(HelpUnavailableTokens);

		const [deleteImportedToken] = getAllByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON);

		await fireEvent.click(deleteImportedToken);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

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

	it('should also remove the deleted token from the main token list', async () => {
		vi.spyOn(backendApi, 'removeCustomToken').mockResolvedValue(undefined);
		vi.spyOn(toastsStore, 'toastsShow').mockImplementation(vi.fn());

		// A token whose query answer mapped while its certified answer did not is in both lists.
		icrcCustomTokensStore.setAll([
			{
				data: { ...mockIcrcCustomToken, ledgerCanisterId: importedToken.ledgerCanisterId },
				certified: true
			}
		]);

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON));

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

		await waitFor(() => {
			expect(get(icrcUnavailableCustomTokensStore)).toEqual([]);
		});

		expect(get(icrcCustomTokensStore)).toEqual([]);
	});

	it('should keep a deleted token out of a load that started before the delete', async () => {
		vi.spyOn(backendApi, 'removeCustomToken').mockResolvedValue(undefined);
		vi.spyOn(toastsStore, 'toastsShow').mockImplementation(vi.fn());

		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getAllByTestId, getByTestId } = render(HelpUnavailableTokens);

		const [deleteImportedToken] = getAllByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON);

		await fireEvent.click(deleteImportedToken);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

		await waitFor(() => {
			expect(get(icrcUnavailableCustomTokensStore)).toEqual([curatedToken]);
		});

		// The certified round of a load that read the saved tokens before the delete.
		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		await tick();

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([curatedToken]);
		expect(getAllByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON)).toHaveLength(1);
	});

	it('should remove the row once the backend deleted the token, even when clearing its cached copy fails', async () => {
		const err = new Error('test');

		vi.spyOn(backendApi, 'removeCustomToken').mockResolvedValue(undefined);
		const toastsErrorMock = vi.spyOn(toastsStore, 'toastsError').mockImplementation(vi.fn());

		vi.mocked(idbKeyval.get).mockRejectedValueOnce(err);

		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		const { getAllByTestId, getByTestId } = render(HelpUnavailableTokens);

		const [deleteImportedToken] = getAllByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON);

		await fireEvent.click(deleteImportedToken);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

		await waitFor(() => {
			expect(toastsErrorMock).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.tokens.error.unexpected_error_on_token_delete },
				err
			});
		});

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([curatedToken]);

		// The backend no longer has the token, so a load that read it before stays without it too.
		icrcUnavailableCustomTokensStore.set([importedToken, curatedToken]);

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([curatedToken]);
	});

	it('should keep the token and show an error when deleting fails', async () => {
		const err = new Error('test');

		vi.spyOn(backendApi, 'removeCustomToken').mockRejectedValue(err);
		const toastsErrorMock = vi.spyOn(toastsStore, 'toastsError').mockImplementation(vi.fn());

		icrcUnavailableCustomTokensStore.set([importedToken]);

		const { getByTestId } = render(HelpUnavailableTokens);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON));

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

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

		const { getByTestId } = render(HelpUnavailableTokens);

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_DELETE_BUTTON));

		await fireEvent.click(getByTestId(HELP_UNAVAILABLE_TOKENS_CONFIRM_DELETE_BUTTON));

		expect(removeCustomTokenMock).not.toHaveBeenCalled();
		expect(get(icrcUnavailableCustomTokensStore)).toEqual([importedToken]);
	});
});
