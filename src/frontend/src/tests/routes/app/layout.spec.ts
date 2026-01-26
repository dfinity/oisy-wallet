import { page } from '$app/state';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { isUserMintingAccount } from '$icp/services/icrc-minting.services';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { pageToken } from '$lib/derived/page-token.derived';
import { authStore } from '$lib/stores/auth.store';
import { isRouteTransactions } from '$lib/utils/nav.utils';
import App from '$routes/(app)/+layout.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcAccount, mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$icp/services/worker.ck-minter-info.services', () => ({
	initCkBTCMinterInfoWorker: vi.fn()
}));

vi.mock('$icp/services/icrc-minting.services', () => ({
	isUserMintingAccount: vi.fn()
}));

describe('App Layout', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		authStore.setForTesting(mockIdentity);

		mockPage.reset();

		vi.mocked(isUserMintingAccount).mockResolvedValue(false);
	});

	it('should render the app layout', () => {
		const { container } = render(App);

		expect(container).toBeTruthy();
	});

	describe('when handling the minting account store', () => {
		const mockIcrcToken = { ...mockValidIcToken, enabled: true };

		beforeEach(() => {
			icrcCustomTokensStore.resetAll();

			icrcCustomTokensStore.setAll([{ data: mockIcrcToken, certified: false }]);

			mockPage.reset();

			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}` });
			mockPage.mockToken(mockIcrcToken);

			vi.mocked(isUserMintingAccount).mockResolvedValue(true);
		});

		it('should set it to `false` if it is not the transaction page', async () => {
			isIcMintingAccount.set(true);

			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Settings}` });

			render(App);

			await waitFor(() => {
				expect(isRouteTransactions(page)).toBeFalsy();
				expect(get(pageToken)).toBeDefined();
			});

			expect(isUserMintingAccount).not.toHaveBeenCalled();

			expect(get(isIcMintingAccount)).toBeFalsy();
		});

		it('should set it to `false` if the page token is nullish', async () => {
			isIcMintingAccount.set(true);

			mockPage.mock({});

			render(App);

			await waitFor(() => {
				expect(isRouteTransactions(page)).toBeTruthy();
				expect(get(pageToken)).toBeUndefined();
			});

			expect(isUserMintingAccount).not.toHaveBeenCalled();

			expect(get(isIcMintingAccount)).toBeFalsy();
		});

		it('should set it to `false` if the page token is not an IC token', async () => {
			isIcMintingAccount.set(true);

			mockPage.mockToken(SOLANA_TOKEN);

			render(App);

			await waitFor(() => {
				expect(isRouteTransactions(page)).toBeTruthy();
				expect(get(pageToken)).toBeDefined();
			});

			expect(isUserMintingAccount).not.toHaveBeenCalled();

			expect(get(isIcMintingAccount)).toBeFalsy();
		});

		it('should set it to `true` if the user is the minting account of the current token', async () => {
			isIcMintingAccount.set(false);

			render(App);

			await waitFor(() => {
				expect(isRouteTransactions(page)).toBeTruthy();
				expect(get(pageToken)).toBeDefined();

				expect(isUserMintingAccount).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					account: mockIcrcAccount,
					token: mockIcrcToken
				});
			});

			expect(get(isIcMintingAccount)).toBeTruthy();
		});

		it('should set it to `false` if the service fails', async () => {
			isIcMintingAccount.set(true);

			vi.mocked(isUserMintingAccount).mockRejectedValue(new Error('Service error'));

			render(App);

			await waitFor(() => {
				expect(isRouteTransactions(page)).toBeTruthy();
				expect(get(pageToken)).toBeDefined();
			});

			expect(isUserMintingAccount).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				account: mockIcrcAccount,
				token: mockIcrcToken
			});

			expect(get(isIcMintingAccount)).toBeFalsy();
		});
	});
});
