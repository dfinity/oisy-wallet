import { AppPath } from '$lib/constants/routes.constants';
import {
	AMOUNT_DATA,
	LOADER_MODAL,
	LOGIN_BUTTON,
	LOGOUT_BUTTON,
	MANAGE_TOKENS_MODAL,
	MANAGE_TOKENS_MODAL_BUTTON,
	MANAGE_TOKENS_MODAL_SAVE,
	MANAGE_TOKENS_MODAL_TOKEN_TOGGLE,
	MOBILE_NAVIGATION_MENU,
	NAVIGATION_ITEM_HOMEPAGE,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_MENU,
	NAVIGATION_MENU_BUTTON,
	NAVIGATION_MENU_PRIVACY_MODE_BUTTON,
	NETWORKS_SWITCHER_DROPDOWN,
	NETWORKS_SWITCHER_SELECTOR,
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT,
	SETTINGS_ACTIVE_NETWORKS_EDIT_BUTTON,
	SETTINGS_NETWORKS_MODAL,
	SETTINGS_NETWORKS_MODAL_SAVE_BUTTON,
	SETTINGS_NETWORKS_MODAL_TESTNETS_CONTAINER,
	SETTINGS_NETWORKS_MODAL_TESTNET_CHECKBOX,
	SETTINGS_NETWORKS_MODAL_TESTNET_TOGGLE,
	SIDEBAR_NAVIGATION_MENU,
	TOKEN_BALANCE,
	TOKEN_CARD,
	TOKEN_GROUP
} from '$lib/constants/test-ids.constants';
import type { InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { isNullish, nonNullish } from '@dfinity/utils';
import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';
import { getQRCodeValueFromCanvas } from '../qr-code.utils';
import {
	getReceiveTokensModalAddressLabelSelector,
	getReceiveTokensModalQrCodeButtonSelector
} from '../selectors.utils';

interface HomepageParams {
	page: Page;
	viewportSize?: ViewportSize;
	isMobile?: boolean;
}

export type HomepageLoggedInParams = {
	iiPage: InternetIdentityPage;
} & HomepageParams;

interface SelectorOperationParams {
	selector: string;
}

interface TestIdOperationParams {
	testId: string;
}

interface WaitForModalParams {
	modalOpenButtonTestId: string;
	modalTestId: string;
	state?: 'detached';
}

interface TakeScreenshotParams {
	centeredElementTestId?: string;
	screenshotTarget?: Locator;
}

type TestModalSnapshotParams = {
	selectorsToMock?: string[];
} & WaitForModalParams;

interface ClickMenuItemParams {
	menuItemTestId: string;
}

interface WaitForLocatorOptions {
	state: 'attached' | 'detached' | 'visible' | 'hidden';
	timeout?: number;
}

interface ShowSelectorParams {
	display?: 'block' | 'flex';
}

abstract class Homepage {
	readonly #page: Page;
	readonly #viewportSize?: ViewportSize;
	readonly #isMobile?: boolean;

	protected constructor({ page, viewportSize, isMobile }: HomepageParams) {
		this.#page = page;
		this.#viewportSize = viewportSize;
		this.#isMobile = isMobile;
	}

	protected async clickByTestId({
		testId,
		scrollIntoView = true
	}: {
		testId: string;
		scrollIntoView?: boolean;
	}): Promise<void> {
		const locator = this.#page.getByTestId(testId).filter({ visible: true });

		if (scrollIntoView) {
			// Method `click` auto-scrolls into view if needed.
			await locator.click();
			return;
		}

		// Since the method `click` auto-scrolls into view, we could prefer to avoid it.
		// That is because it could potentially have different screenshot outputs if it takes more time to load and scrolls more.
		await locator.dispatchEvent('click');
	}

	protected async waitForByTestId({
		testId,
		options
	}: TestIdOperationParams & { options?: WaitForLocatorOptions }): Promise<void> {
		await this.#page.getByTestId(testId).waitFor(options);
	}

	protected async isVisibleByTestId(testId: string): Promise<boolean> {
		const element = this.#page.locator(`[data-tid="${testId}"]`);
		return await element.isVisible();
	}

	private async isSelectorVisible({ selector }: SelectorOperationParams): Promise<boolean> {
		return await this.#page.isVisible(selector);
	}

	private async isSelectorNotVisible({ selector }: SelectorOperationParams): Promise<boolean> {
		const isVisible = await this.isSelectorVisible({ selector });

		return !isVisible;
	}

	private async hideSelector({ selector }: SelectorOperationParams): Promise<void> {
		if (await this.isSelectorVisible({ selector })) {
			await this.#page.locator(selector).evaluate((element) => (element.style.display = 'none'));
		}
	}

	private async showSelector({
		selector,
		display = 'block'
	}: SelectorOperationParams & ShowSelectorParams): Promise<void> {
		if (await this.isSelectorNotVisible({ selector })) {
			const locator = this.#page.locator(selector);

			if (display === 'flex') {
				await locator.evaluate((element) => (element.style.display = 'flex'));
				return;
			}

			await locator.evaluate((element) => (element.style.display = 'block'));
		}
	}

	protected async mockSelector({ selector }: SelectorOperationParams): Promise<void> {
		await this.#page.locator(selector).innerHTML();

		if (await this.isSelectorVisible({ selector })) {
			const elementsLocator = this.#page.locator(selector);
			await elementsLocator.evaluate((element) => (element.innerHTML = 'placeholder'));
			await elementsLocator.locator('text=placeholder').first().waitFor();
		}
	}

	protected async mockSelectorAll({ selector }: SelectorOperationParams): Promise<void> {
		const elementsLocator = this.#page.locator(selector);

		// Wait for the first match to render before masking. Otherwise
		// `evaluateAll` runs against an empty NodeList (silently no-op) and
		// the screenshot captures the un-mocked, time-sensitive content.
		await elementsLocator.first().waitFor({ state: 'visible' });

		await elementsLocator.evaluateAll((elements) => {
			for (const element of elements) {
				(element as HTMLElement).innerHTML = 'placeholder';
			}
		});

		await elementsLocator.locator('text=placeholder').first().waitFor();
	}

	private async goto(): Promise<void> {
		await this.#page.goto(HOMEPAGE_URL);
	}

	private async setViewportSize(viewportSize: ViewportSize) {
		await this.#page.setViewportSize(viewportSize);
	}

	private async waitForNavigationMenu(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: NAVIGATION_MENU, options });
	}

	protected async waitForLoginButton(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: LOGIN_BUTTON, options });
	}

	protected async readQRCode({ selector }: SelectorOperationParams): Promise<string | undefined> {
		await this.#page.locator(selector).waitFor();
		return await getQRCodeValueFromCanvas({ page: this.#page, selector });
	}

	protected async waitForModal({
		modalOpenButtonTestId,
		modalTestId,
		state
	}: WaitForModalParams): Promise<Locator> {
		const modal = this.#page.getByTestId(modalTestId);
		if (state === 'detached') {
			await modal.waitFor({ state });
			return modal;
		}
		await this.clickByTestId({ testId: modalOpenButtonTestId, scrollIntoView: false });
		await modal.waitFor();
		return modal;
	}

	protected async waitForHomepageReady(): Promise<void> {
		if (nonNullish(this.#viewportSize)) {
			await this.setViewportSize(this.#viewportSize);
		}

		await this.goto();
		await this.waitForLoggedOutIndicator();
	}

	protected async waitForLoaderModal(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: LOADER_MODAL, options });
	}

	protected async waitForTokensInitialization(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: `${TOKEN_CARD}-ICP-ICP`, options });
		await this.waitForByTestId({ testId: `${TOKEN_GROUP}-ETH`, options });

		await this.waitForByTestId({ testId: `${TOKEN_BALANCE}-ICP-ICP`, options });
		await this.waitForByTestId({ testId: `${TOKEN_BALANCE}-ETH`, options });
	}

	protected async clickMenuItem({ menuItemTestId }: ClickMenuItemParams): Promise<void> {
		await this.clickByTestId({ testId: NAVIGATION_MENU_BUTTON });
		await this.waitForNavigationMenu();

		await this.clickByTestId({ testId: menuItemTestId });
	}

	protected async clickSelector({ selector }: SelectorOperationParams): Promise<void> {
		await this.#page.locator(selector).click();
	}

	protected getLocatorByTestId({ testId }: TestIdOperationParams): Locator {
		return this.#page.getByTestId(testId);
	}

	async waitForTimeout(timeout: number): Promise<void> {
		await this.#page.waitForTimeout(timeout);
	}

	async waitForLoggedOutIndicator(): Promise<void> {
		await this.waitForLoginButton();
	}

	async waitForLoggedInIndicator(): Promise<void> {
		await this.waitForByTestId({ testId: NAVIGATION_MENU_BUTTON });
	}

	protected async elementExistsByTestId(testId: string): Promise<boolean> {
		return await this.#page
			.getByTestId(testId)
			.isVisible()
			.catch(() => false);
	}

	getBalanceLocator(): Locator {
		return this.#page.getByTestId(AMOUNT_DATA);
	}

	async setInputValueByTestId({
		testId,
		value
	}: TestIdOperationParams & { value: string }): Promise<void> {
		await this.#page.getByTestId(testId).fill(value);
	}

	async getAccountIdByTestId(testId: string): Promise<string> {
		const addressLocator = getReceiveTokensModalAddressLabelSelector({
			sectionSelector: testId
		});
		const addressText = await this.#page.locator(addressLocator).innerHTML();
		if (!addressText) {
			throw new Error('No address text found in container icp-account-id');
		}
		return addressText.trim();
	}

	async testModalSnapshot({
		modalOpenButtonTestId,
		modalTestId,
		selectorsToMock
	}: TestModalSnapshotParams): Promise<void> {
		const modal = await this.waitForModal({
			modalOpenButtonTestId,
			modalTestId
		});

		if (nonNullish(selectorsToMock)) {
			await Promise.all(
				selectorsToMock.map(async (selector) => await this.mockSelector({ selector }))
			);
		}

		await this.takeScreenshot({ screenshotTarget: modal });
	}

	async waitForLoadState() {
		await this.#page.waitForLoadState('networkidle');
	}

	async navigateTo({
		testId,
		expectedPath
	}: {
		testId: string;
		expectedPath: AppPath;
	}): Promise<void> {
		if (await this.isVisibleByTestId(testId)) {
			await this.clickByTestId({ testId });
		} else if (await this.isVisibleByTestId(`mobile-${testId}`)) {
			await this.clickByTestId({ testId: `mobile-${testId}` });
		} else {
			throw new Error('Cannot reach navigation menu!');
		}

		const urlRegex = new RegExp(`${expectedPath}(\\?.*|#.*|$)`);
		await this.#page.waitForURL(urlRegex);
	}

	private async toggleAllTestnets(): Promise<void> {
		const toggles = this.#page.locator(`[data-tid^="${SETTINGS_NETWORKS_MODAL_TESTNET_TOGGLE}-"]`);
		const countToggles = await toggles.count();
		const testIds = await Promise.all(
			Array.from({ length: countToggles }, (_, i) => toggles.nth(i).getAttribute('data-tid'))
		);
		for (const testId of testIds) {
			if (nonNullish(testId)) {
				await this.clickByTestId({ testId });
			}
		}
	}

	async activateTestnetSettings(): Promise<void> {
		await this.navigateTo({ testId: NAVIGATION_ITEM_SETTINGS, expectedPath: AppPath.Settings });
		await this.clickByTestId({ testId: SETTINGS_ACTIVE_NETWORKS_EDIT_BUTTON });
		await this.clickByTestId({ testId: SETTINGS_NETWORKS_MODAL_TESTNET_CHECKBOX });
		await this.waitForByTestId({ testId: SETTINGS_NETWORKS_MODAL_TESTNETS_CONTAINER });
		await this.toggleAllTestnets();
		await this.clickByTestId({ testId: SETTINGS_NETWORKS_MODAL_SAVE_BUTTON });
		await this.waitForByTestId({
			testId: SETTINGS_NETWORKS_MODAL,
			options: { state: 'hidden', timeout: 60000 }
		});
		await this.clickByTestId({ testId: NAVIGATION_ITEM_HOMEPAGE });
	}

	private async scrollToTop(testId: string): Promise<void> {
		if (await this.isVisibleByTestId(testId)) {
			const selector = `[data-tid="${testId}"]`;
			const locator = this.#page.locator(selector);
			await locator.evaluate((element) => {
				element.scrollTo(0, 0);
			});
		}
	}

	private async scrollIntoViewCentered(testId: string): Promise<void> {
		const selector = `[data-tid="${testId}"]`;
		const locator = this.#page.locator(selector);
		await locator.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
	}

	private async hideMobileNavigationMenu(): Promise<void> {
		await this.hideSelector({ selector: `[data-tid="${MOBILE_NAVIGATION_MENU}"]` });
	}

	private async showMobileNavigationMenu(): Promise<void> {
		await this.showSelector({
			selector: `[data-tid="${MOBILE_NAVIGATION_MENU}"]`,
			display: 'flex'
		});
	}

	protected async waitForManageTokensModal(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: MANAGE_TOKENS_MODAL, options });
	}

	async openNetworkSelector(): Promise<void> {
		await this.scrollIntoViewCentered(NETWORKS_SWITCHER_DROPDOWN);
		await this.clickByTestId({ testId: NETWORKS_SWITCHER_DROPDOWN });
	}

	async toggleNetworkSelector({ networkSymbol }: { networkSymbol: string }): Promise<void> {
		await this.openNetworkSelector();
		await this.clickByTestId({ testId: `${NETWORKS_SWITCHER_SELECTOR}-${networkSymbol}` });
	}

	async toggleTokenInList({
		tokenSymbol,
		networkSymbol
	}: {
		tokenSymbol: string;
		networkSymbol: string;
	}): Promise<void> {
		await this.toggleNetworkSelector({ networkSymbol });
		await this.clickByTestId({ testId: MANAGE_TOKENS_MODAL_BUTTON });
		await this.waitForManageTokensModal();
		await this.clickByTestId({
			testId: `${MANAGE_TOKENS_MODAL_TOKEN_TOGGLE}-${tokenSymbol}-${networkSymbol}`
		});
		await this.clickByTestId({ testId: MANAGE_TOKENS_MODAL_SAVE });
		await this.waitForManageTokensModal({ state: 'hidden', timeout: 60000 });
	}

	getTokenCardTestId({
		tokenSymbol,
		networkSymbol
	}: {
		tokenSymbol: string;
		networkSymbol: string;
	}): string {
		return `${TOKEN_CARD}-${tokenSymbol}-${networkSymbol}`;
	}

	getTokenCardLocator(params: { tokenSymbol: string; networkSymbol: string }): Locator {
		return this.#page.locator(`[data-tid="${this.getTokenCardTestId(params)}"]`);
	}

	async getStableViewportHeight(): Promise<number> {
		// Hard cap so a page with an animation, polling worker, or streaming
		// content that never settles can't burn the entire test timeout. If
		// the page hasn't stabilised after `MAX_POLLS * POLL_INTERVAL_MS`,
		// fall back to the latest sample and let the snapshot diff surface
		// any layout drift instead of hanging.
		const POLL_INTERVAL_MS = 1_000;
		const MAX_POLLS = 10;

		let previousHeight: number;
		let currentHeight: number = await this.#page.evaluate(
			() => document.documentElement.scrollHeight
		);

		for (let i = 0; i < MAX_POLLS; i++) {
			previousHeight = currentHeight;
			await this.#page.waitForTimeout(POLL_INTERVAL_MS);
			currentHeight = await this.#page.evaluate(() => document.documentElement.scrollHeight);
			if (currentHeight === previousHeight) {
				return currentHeight;
			}
		}

		return currentHeight;
	}

	// Web fonts and lazily-imported images (e.g. the landing page hero) can
	// finish loading *after* `networkidle` and reflow the page by tens of
	// pixels. Measuring the height before they settle bakes a
	// non-deterministic value into the screenshot viewport, which is why the
	// full-page snapshots regenerate on every run. Block on them first.
	private async waitForStableLayout(): Promise<void> {
		await this.#page.evaluate(async () => {
			await document.fonts.ready;

			// A `loading="lazy"` image below the fold may never start loading, so
			// awaiting its `load` event would hang until the test timeout. Only
			// block on images that are actually loading: eager ones, or lazy ones
			// already within the viewport (which load immediately).
			const inViewport = (img: HTMLImageElement): boolean => {
				const { top, bottom } = img.getBoundingClientRect();
				return bottom > 0 && top < window.innerHeight;
			};

			// Safety net so a single stalled download can't block the helper
			// indefinitely.
			const PER_IMAGE_TIMEOUT_MS = 5_000;

			await Promise.all(
				Array.from(document.querySelectorAll('img'))
					.filter((img) => !img.complete && (img.loading !== 'lazy' || inViewport(img)))
					.map(
						(img) =>
							new Promise<void>((resolve) => {
								img.addEventListener('load', () => resolve(), { once: true });
								img.addEventListener('error', () => resolve(), { once: true });
								setTimeout(resolve, PER_IMAGE_TIMEOUT_MS);
							})
					)
			);
		});
	}

	private async viewportAdjuster(): Promise<void> {
		await this.waitForLoadState();
		await this.waitForStableLayout();
		const stablePageHeight = await this.getStableViewportHeight();

		const currentViewport = this.#page.viewportSize();
		const width = currentViewport?.width ?? (await this.#page.evaluate(() => window.innerWidth));

		await this.#page.setViewportSize({ height: stablePageHeight, width });
	}

	async takeScreenshot({
		centeredElementTestId,
		screenshotTarget
	}: TakeScreenshotParams = {}): Promise<void> {
		if (isNullish(screenshotTarget) && !this.#isMobile) {
			// Creates a snapshot as a fullPage and not just certain parts (if not a mobile).
			await this.viewportAdjuster();
		}

		const element = screenshotTarget ?? this.#page;

		if (!this.#isMobile) {
			await this.scrollToTop(SIDEBAR_NAVIGATION_MENU);
		}

		if (nonNullish(centeredElementTestId)) {
			await this.scrollIntoViewCentered(centeredElementTestId);
		}

		await this.#page.mouse.move(0, 0);

		const colorSchemes = ['light', 'dark'] as const;
		for (const scheme of colorSchemes) {
			await this.#page.emulateMedia({ colorScheme: scheme });
			await this.#page.waitForTimeout(1000);

			// There is a race condition with playwright: it can happen that there is a bad error about
			// screenshot existence, even if the screenshot is created/overwritten.
			// Issue: https://github.com/microsoft/playwright/issues/36228
			// TODO: remove the try-catch block (and the pause) when the issue is fixed in playwright
			try {
				await this.#page.waitForTimeout(5000);

				await expect(element).toHaveScreenshot();
			} catch (error: unknown) {
				console.warn(error);
			}

			// If it's mobile, we want a full page screenshot too, but without the navigation bar.
			if (this.#isMobile) {
				await this.hideMobileNavigationMenu();

				// There is a race condition with playwright: it can happen that there is an error about
				// screenshot existence, even if the screenshot is created/overwritten.
				// Issue: https://github.com/microsoft/playwright/issues/36228
				// TODO: remove the try-catch block (and the pause) when the issue is fixed in playwright
				try {
					await this.#page.waitForTimeout(5000);

					await expect(element).toHaveScreenshot({ fullPage: true });
				} catch (error: unknown) {
					console.warn(error);
				}

				await this.showMobileNavigationMenu();
			}
		}
		await this.#page.emulateMedia({ colorScheme: null });
	}

	abstract extendWaitForReady(): Promise<void>;

	abstract waitForReady(): Promise<void>;
}

export class HomepageLoggedOut extends Homepage {
	constructor(params: HomepageParams) {
		super(params);
	}

	override async extendWaitForReady(): Promise<void> {}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForHomepageReady();
		await this.waitForLoadState();
	}
}

export class HomepageLoggedIn extends Homepage {
	readonly #iiPage: InternetIdentityPage;

	constructor({ iiPage, ...rest }: HomepageLoggedInParams) {
		super(rest);

		this.#iiPage = iiPage;
	}

	async waitForAuthentication(): Promise<void> {
		await this.#iiPage.waitReady({
			url: LOCAL_REPLICA_URL,
			canisterId: process.env.E2E_LOCAL_INTERNET_IDENTITY_CANISTER_ID
		});

		await this.waitForHomepageReady();

		await this.#iiPage.signIn();
	}

	async checkIfStillLoggedIn(timeout = 10000): Promise<void> {
		await this.waitForLoggedInIndicator();

		await this.waitForTimeout(timeout);

		await this.waitForLoggedInIndicator();
	}

	async waitForLogout(): Promise<void> {
		await this.clickMenuItem({ menuItemTestId: LOGOUT_BUTTON });

		await this.waitForLoggedOutIndicator();
	}

	async activatePrivacyMode(): Promise<void> {
		await this.clickMenuItem({ menuItemTestId: NAVIGATION_MENU_PRIVACY_MODE_BUTTON });
	}

	async clickTokenGroupCard(tokenSymbol: string): Promise<void> {
		await this.clickByTestId({ testId: `${TOKEN_GROUP}-${tokenSymbol}` });
	}

	async testReceiveModalQrCode({
		receiveModalSectionSelector
	}: {
		receiveModalSectionSelector: string;
	}): Promise<void> {
		await this.waitForModal({
			modalOpenButtonTestId: RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
			modalTestId: RECEIVE_TOKENS_MODAL
		});

		await this.clickSelector({
			selector: getReceiveTokensModalQrCodeButtonSelector({
				sectionSelector: receiveModalSectionSelector
			})
		});

		const qrCodeOutputLocator = this.getLocatorByTestId({
			testId: RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT
		});
		await qrCodeOutputLocator.waitFor();

		const qrCode = await this.readQRCode({
			selector: `[data-tid="${RECEIVE_TOKENS_MODAL}"] canvas`
		});

		await expect(qrCodeOutputLocator).toHaveText(qrCode ?? '');
	}

	override async extendWaitForReady(): Promise<void> {
		// Extend the waitForReady method in a subclass
	}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForAuthentication();

		// Skip the "wait for `loader-modal` to appear then disappear" pattern:
		// the loader can render and vanish faster than Playwright's poll, so
		// waiting for `visible` deadlocks. `waitForContentReady()` checks the
		// real destination (tokens initialised) directly.
		await this.waitForContentReady();
	}

	async waitForContentReady(): Promise<void> {
		await this.waitForTokensInitialization();

		await this.waitForLoadState();

		await this.extendWaitForReady();
	}
}
