import { AppPath } from '$lib/constants/routes.constants';
import {
	LOADER_MODAL,
	LOGIN_BUTTON,
	MOBILE_NAVIGATION_MENU,
	SIDEBAR_NAVIGATION_MENU,
	TOKEN_BALANCE,
	TOKEN_CARD,
	TOKEN_GROUP
} from '$lib/constants/test-ids.constants';
import type { InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { isNullish, nonNullish } from '@dfinity/utils';
import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';

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

interface TakeScreenshotParams {
	freezeCarousel?: boolean;
	centeredElementTestId?: string;
	screenshotTarget?: Locator;
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

	private async goto(): Promise<void> {
		await this.#page.goto(HOMEPAGE_URL);
	}

	private async setViewportSize(viewportSize: ViewportSize) {
		await this.#page.setViewportSize(viewportSize);
	}

	protected async waitForLoginButton(options?: WaitForLocatorOptions): Promise<void> {
		await this.waitForByTestId({ testId: LOGIN_BUTTON, options });
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

	protected getLocatorByTestId({ testId }: TestIdOperationParams): Locator {
		return this.#page.getByTestId(testId);
	}

	async waitForLoggedOutIndicator(): Promise<void> {
		await this.waitForLoginButton();
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

	async getStableViewportHeight(): Promise<number> {
		let previousHeight: number;
		let currentHeight: number = await this.#page.evaluate(
			() => document.documentElement.scrollHeight
		);

		do {
			previousHeight = currentHeight;
			await this.#page.waitForTimeout(1000);
			currentHeight = await this.#page.evaluate(() => document.documentElement.scrollHeight);
		} while (currentHeight !== previousHeight);

		return currentHeight;
	}

	private async viewportAdjuster(): Promise<void> {
		await this.waitForLoadState();
		const stablePageHeight = await this.getStableViewportHeight();

		const currentViewport = this.#page.viewportSize();
		const width = currentViewport?.width ?? (await this.#page.evaluate(() => window.innerWidth));

		await this.#page.setViewportSize({ height: stablePageHeight, width });
	}

	async takeScreenshot(
		{ freezeCarousel: _ = false, centeredElementTestId, screenshotTarget }: TakeScreenshotParams = {
			freezeCarousel: false
		}
	): Promise<void> {
		if (isNullish(screenshotTarget) && !this.#isMobile) {
			// Creates a snapshot as a fullPage and not just certain parts (if not a mobile).
			await this.viewportAdjuster();
		}

		const element = screenshotTarget ?? this.#page;

		// TODO: the carousel is too flaky for the E2E tests, so we need completely mask it and work on freezing it in a permanent state in another PR.
		// if (freezeCarousel) {
		// 	// Freezing the time because the carousel has a timer that resets the animations and the transitions.
		// 	await this.#page.clock.pauseAt(Date.now());
		// 	await this.setCarouselFirstSlide();
		// 	await this.#page.clock.pauseAt(Date.now());
		// }

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

		// TODO: the carousel is too flaky for the E2E tests, so we need completely mask it and work on freezing it in a permanent state in another PR.
		// if (freezeCarousel) {
		// 	// Resuming the time that we froze because of the carousel animations.
		// 	await this.#page.clock.resume();
		// }
	}

	abstract extendWaitForReady(): Promise<void>;

	abstract waitForReady(): Promise<void>;
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

		await this.#iiPage.signInWithNewIdentity();
	}

	override async extendWaitForReady(): Promise<void> {
		// Extend the waitForReady method in a subclass
	}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForAuthentication();

		await this.waitForLoaderModal();

		await this.waitForLoaderModal({ state: 'hidden', timeout: 60000 });

		await this.waitForContentReady();
	}

	async waitForContentReady(): Promise<void> {
		await this.waitForTokensInitialization();

		await this.waitForLoadState();

		await this.extendWaitForReady();
	}
}
