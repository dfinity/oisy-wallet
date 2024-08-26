import {
	HERO_ANIMATION_CANVAS,
	LOGIN_BUTTON,
	LOGOUT_BUTTON,
	NAVIGATION_MENU,
	NAVIGATION_MENU_BUTTON,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constants';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { nonNullish } from '@dfinity/utils';
import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';

type HomepageParams = {
	page: Page;
};

type HomepageLoggedInParams = {
	iiPage: InternetIdentityPage;
} & HomepageParams;

type WaitForModalParams = {
	modalOpenButtonTestId: string;
	modalTestId: string;
};

type TestModalSnapshotParams = {
	viewportSize?: ViewportSize;
} & WaitForModalParams;

type ClickMenuItemParams = {
	menuItemTestId: string;
};

type WaitForLocatorOptions = {
	state: 'attached' | 'detached' | 'visible' | 'hidden';
};

abstract class Homepage {
	readonly #page: Page;

	protected constructor(page: Page) {
		this.#page = page;
	}

	private async hideHeroAnimation(): Promise<void> {
		await this.#page
			.getByTestId(HERO_ANIMATION_CANVAS)
			.evaluate((element) => (element.style.display = 'none'));
	}

	private async goto(): Promise<void> {
		await this.#page.goto(HOMEPAGE_URL);
	}

	private async waitForModal({
		modalOpenButtonTestId,
		modalTestId
	}: WaitForModalParams): Promise<Locator> {
		await this.#page.getByTestId(modalOpenButtonTestId).click();
		const modal = this.#page.getByTestId(modalTestId);
		await modal.waitFor();

		return modal;
	}

	private async setViewportSize(viewportSize: ViewportSize) {
		await this.#page.setViewportSize(viewportSize);
	}

	private async waitForNavigationMenu(options?: WaitForLocatorOptions): Promise<void> {
		await this.#page.getByTestId(NAVIGATION_MENU).waitFor(options);
	}

	protected async waitForLoginButton(options?: WaitForLocatorOptions): Promise<void> {
		await this.#page.getByTestId(LOGIN_BUTTON).waitFor(options);
	}

	protected async waitForHomepageReady(): Promise<void> {
		await this.goto();
		await this.waitForLoginButton();
		await this.hideHeroAnimation();
	}

	protected async waitForTokenSkeletonsInitialization(
		options?: WaitForLocatorOptions
	): Promise<void> {
		await this.#page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor(options);
	}

	protected async clickMenuItem({ menuItemTestId }: ClickMenuItemParams): Promise<void> {
		await this.#page.getByTestId(NAVIGATION_MENU_BUTTON).click();
		await this.waitForNavigationMenu();

		await this.#page.getByTestId(menuItemTestId).click();
	}

	async testModalSnapshot({
		viewportSize,
		modalOpenButtonTestId,
		modalTestId
	}: TestModalSnapshotParams): Promise<void> {
		if (nonNullish(viewportSize)) {
			await this.setViewportSize(viewportSize);
		}

		await this.waitForHomepageReady();

		const modal = await this.waitForModal({
			modalOpenButtonTestId,
			modalTestId
		});

		await expect(modal).toHaveScreenshot();
	}

	abstract waitForReady(): Promise<void>;
}

export class HomepageLoggedOut extends Homepage {
	constructor({ page }: HomepageParams) {
		super(page);
	}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForHomepageReady();
	}
}

export class HomepageLoggedIn extends Homepage {
	readonly #iiPage: InternetIdentityPage;

	constructor({ page, iiPage }: HomepageLoggedInParams) {
		super(page);

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

	async waitForLogout(): Promise<void> {
		await this.clickMenuItem({ menuItemTestId: LOGOUT_BUTTON });

		await this.waitForLoginButton();
		await this.waitForTokenSkeletonsInitialization({ state: 'detached' });
	}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForAuthentication();

		await this.waitForTokenSkeletonsInitialization();
	}
}
