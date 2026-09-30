import { XRP_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import * as trustLineTokensEnv from '$env/xrp-trust-line-tokens.env';
import {
	TOKEN_MENU_XRP_BUTTON,
	TOKEN_MENU_XRP_EXPLORER_LINK
} from '$lib/constants/test-ids.constants';
import { modalXrpHideToken, modalXrpToken } from '$lib/derived/modal.derived';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import XrpTokenMenu from '$xrp/components/tokens/XrpTokenMenu.svelte';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpTokenMenu', () => {
	const tokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_XRP_BUTTON}"]`;
	const explorerLinkSelector = `a[data-tid="${TOKEN_MENU_XRP_EXPLORER_LINK}"]`;

	beforeEach(() => {
		mockPage.reset();
		mockPage.mockToken(XRP_TOKEN);

		xrpAddressMainnetStore.reset();
		modalStore.close();
	});

	it('external link forwards to the account on the mainnet explorer', async () => {
		xrpAddressMainnetStore.set({ certified: true, data: mockXrpAddress });

		const { container } = render(XrpTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			const a: HTMLAnchorElement | null = container.querySelector(explorerLinkSelector);
			if (a == null) {
				throw new Error('anchor not yet loaded');
			}

			expect(a.href).toEqual(`${XRP_MAINNET_EXPLORER_URL}/account/${mockXrpAddress}`);
		});
	});

	it('does not render the explorer link without an address', async () => {
		const { container, getByText } = render(XrpTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			expect(getByText(get(i18n).tokens.details.title)).toBeInTheDocument();
		});

		expect(container.querySelector(explorerLinkSelector)).toBeNull();
	});

	it('opens the XRP token details modal', async () => {
		const { container, getByText } = render(XrpTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			expect(getByText(get(i18n).tokens.details.title)).toBeInTheDocument();
		});

		await fireEvent.click(getByText(get(i18n).tokens.details.title));

		expect(get(modalXrpToken)).toBeTruthy();
	});

	it('offers no hiding for native XRP', async () => {
		const { container, getByText, queryByText } = render(XrpTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			expect(getByText(get(i18n).tokens.details.title)).toBeInTheDocument();
		});

		expect(queryByText(get(i18n).tokens.hide.token.replace('$token', XRP_TOKEN.symbol))).toBeNull();
	});

	describe('a trust-line token', () => {
		beforeEach(() => {
			vi.spyOn(trustLineTokensEnv, 'XRP_TRUST_LINE_TOKENS_ENABLED', 'get').mockReturnValue(true);
			xrpTrustLinesStore.set({ tokenId: XRP_TOKEN.id, lines: [mockXrpTrustLine] });

			mockPage.mockToken(RLUSD_TOKEN);
		});

		afterEach(() => {
			vi.restoreAllMocks();
			xrpTrustLinesStore.clear(XRP_TOKEN.id);
		});

		it('is hidden through the XRP hide modal', async () => {
			const hideLabel = get(i18n).tokens.hide.token.replace('$token', RLUSD_TOKEN.symbol);

			const { container, getByText } = render(XrpTokenMenu);
			const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
			button?.click();

			await waitFor(() => {
				expect(getByText(hideLabel)).toBeInTheDocument();
			});

			await fireEvent.click(getByText(hideLabel));

			expect(get(modalXrpHideToken)).toBeTruthy();
		});
	});
});
