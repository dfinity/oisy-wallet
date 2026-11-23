import { page } from '$app/state';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { isUserMintingAccount } from '$icp/services/icrc-minting.services';
import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { pageToken } from '$lib/derived/page-token.derived';
import { ExchangeWorker } from '$lib/services/worker.exchange.services';
import { authStore } from '$lib/stores/auth.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { isRouteTransactions } from '$lib/utils/nav.utils';
import App from '$routes/(app)/+layout.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcAccount, mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$icp/services/worker.ck-minter-info.services', () => ({
	initCkBTCMinterInfoWorker: vi.fn(),
	initCkETHMinterInfoWorker: vi.fn()
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

	describe('reveal on first load', () => {
		beforeEach(() => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}` });

			// The page renders inside the loaders once the user profile is in. jsdom has no Web
			// Worker, so the exchange worker the loaders start never resolves here.
			userProfileStore.set({ certified: false, profile: mockUserProfile });
			vi.spyOn(ExchangeWorker, 'init').mockReturnValue(new Promise(() => {}));
		});

		afterEach(() => {
			userProfileStore.reset();
		});

		it('fades in the hero, then the page one step later', () => {
			const { container } = render(App, { children: mockSnippet });

			const [heroSection, pageSection] = Array.from(
				container.querySelectorAll<HTMLElement>('.reveal')
			);

			expect(heroSection.style.getPropertyValue('--reveal-step')).toBe('');
			expect(pageSection.style.getPropertyValue('--reveal-step')).toBe('1');
		});

		it('fades in the page first when there is no hero', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Settings}` });

			const { container } = render(App, { children: mockSnippet });

			const reveals = container.querySelectorAll<HTMLElement>('.reveal');

			expect(reveals).toHaveLength(1);
			expect(reveals[0].style.getPropertyValue('--reveal-step')).toBe('0');
		});

		it('keeps revealing while only an animation inside the page ends', async () => {
			const { container } = render(App, { children: mockSnippet });

			const [, pageSection] = Array.from(container.querySelectorAll<HTMLElement>('.reveal'));
			const inner = document.createElement('span');
			pageSection.append(inner);

			await fireEvent.animationEnd(inner);

			expect(container.querySelectorAll('.reveal')).toHaveLength(2);
		});

		it('stops revealing once the page has faded in, so nothing fades in again', async () => {
			const { container } = render(App, { children: mockSnippet });

			const [, pageSection] = Array.from(container.querySelectorAll<HTMLElement>('.reveal'));

			await fireEvent.animationEnd(pageSection);

			expect(container.querySelector('.reveal')).toBeNull();
		});
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
