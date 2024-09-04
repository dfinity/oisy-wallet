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
import { getQRCodeValueFromDataURL } from '../qr-code.utils';

type HomepageParams = {
	page: Page;
	viewportSize?: ViewportSize;
};

type HomepageLoggedInParams = {
	iiPage: InternetIdentityPage;
} & HomepageParams;

type SelectorOperationParams = {
	selector: string;
};

type WaitForModalParams = {
	modalOpenButtonTestId: string;
	modalTestId: string;
};

type TestModalSnapshotParams = {
	selectorsToMock?: string[];
} & WaitForModalParams;

type ClickMenuItemParams = {
	menuItemTestId: string;
};

type WaitForLocatorOptions = {
	state: 'attached' | 'detached' | 'visible' | 'hidden';
};

abstract class Homepage {
	readonly #page: Page;
	readonly #viewportSize?: ViewportSize;

	protected constructor({ page, viewportSize }: HomepageParams) {
		this.#page = page;
		this.#viewportSize = viewportSize;
	}

	private async isSelectorVisible({ selector }: SelectorOperationParams): Promise<boolean> {
		return this.#page.isVisible(selector);
	}

	private async hideSelector({ selector }: SelectorOperationParams): Promise<void> {
		if (await this.isSelectorVisible({ selector })) {
			await this.#page.locator(selector).evaluate((element) => (element.style.display = 'none'));
		}
	}

	private async mockSelector({ selector }: SelectorOperationParams): Promise<void> {
		if (await this.isSelectorVisible({ selector })) {
			await this.#page.locator(selector).evaluate((element) => (element.innerHTML = 'placeholder'));
		}
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

	private async getCanvasAsDataURL({
		selector
	}: SelectorOperationParams): Promise<string | undefined> {
		return this.#page.evaluate<string | undefined, { selector: string }>(
			({ selector }) => {
				const canvas = document.querySelector<HTMLCanvasElement>(selector);

				if (nonNullish(canvas)) {
					return canvas.toDataURL();
				}
			},
			{
				selector
			}
		);
	}

	private async readQRCode({ selector }: SelectorOperationParams): Promise<string | undefined> {
		await this.#page.locator(selector).waitFor();

		const dataUrl = await this.getCanvasAsDataURL({ selector });

		if (nonNullish(dataUrl)) {
			return getQRCodeValueFromDataURL({ dataUrl });
		}
	}

	protected async waitForHomepageReady(): Promise<void> {
		if (nonNullish(this.#viewportSize)) {
			await this.setViewportSize(this.#viewportSize);
		}

		await this.goto();
		await this.waitForLoginButton();
		await this.hideSelector({ selector: `[data-tid="${HERO_ANIMATION_CANVAS}"]` });
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
		modalOpenButtonTestId,
		modalTestId,
		selectorsToMock
	}: TestModalSnapshotParams): Promise<void> {
		const modal = await this.waitForModal({
			modalOpenButtonTestId,
			modalTestId
		});

		if (nonNullish(selectorsToMock)) {
			await Promise.all(selectorsToMock.map(async (selector) => this.mockSelector({ selector })));
		}

		await expect(modal).toHaveScreenshot();
	}

	abstract waitForReady(): Promise<void>;
}

export class HomepageLoggedOut extends Homepage {
	constructor(params: HomepageParams) {
		super(params);
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

	constructor({ page, iiPage, viewportSize }: HomepageLoggedInParams) {
		super({ page, viewportSize });

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
