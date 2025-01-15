import {
	LOADER_MODAL,
	LOGIN_BUTTON,
	LOGOUT_BUTTON,
	NAVIGATION_ITEM_HOMEPAGE,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_MENU,
	NAVIGATION_MENU_BUTTON,
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT,
	TESTNET_TOGGLE,
	TOKEN_BALANCE,
	TOKEN_CARD
} from '$lib/constants/test-ids.constants';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { isNullish, nonNullish } from '@dfinity/utils';
import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test';
import { PromotionCarousel } from '../components/promotion-carousel.component';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';
import { getQRCodeValueFromDataURL } from '../qr-code.utils';
import { getReceiveTokensModalQrCodeButtonSelector } from '../selectors.utils';

interface HomepageParams {
	page: Page;
	viewportSize?: ViewportSize;
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

abstract class Homepage {
	readonly #page: Page;
	readonly #viewportSize?: ViewportSize;
	private promotionCarousel?: PromotionCarousel;

	protected constructor({ page, viewportSize }: HomepageParams) {
		this.#page = page;
		this.#viewportSize = viewportSize;
	}

	protected async clickByTestId(testId: string): Promise<void> {
		await this.#page.getByTestId(testId).click();
	}

	protected async isVisibleByTestId(testId: string): Promise<boolean> {
		const element = this.#page.locator(`[data-tid="${testId}"]`);
		return await element.isVisible();
	}

	private async isSelectorVisible({ selector }: SelectorOperationParams): Promise<boolean> {
		return await this.#page.isVisible(selector);
	}

	private async hideSelector({ selector }: SelectorOperationParams): Promise<void> {
		if (await this.isSelectorVisible({ selector })) {
			await this.#page.locator(selector).evaluate((element) => (element.style.display = 'none'));
		}
	}

	protected async mockSelector({ selector }: SelectorOperationParams): Promise<void> {
		if (await this.#page.locator(selector).isVisible()) {
			await this.#page.locator(selector).innerHTML();

			await this.#page.locator(selector).evaluate((element) => (element.innerHTML = 'placeholder'));
		}
	}

	private async goto(): Promise<void> {
		await this.#page.goto(HOMEPAGE_URL);
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
		return await this.#page.evaluate<string | undefined, { selector: string }>(
			({ selector }) => {
				const canvas = document.querySelector<HTMLCanvasElement>(selector);
				return canvas?.toDataURL();
			},
			{
				selector
			}
		);
	}

	protected async readQRCode({ selector }: SelectorOperationParams): Promise<string | undefined> {
		await this.#page.locator(selector).waitFor();

		const dataUrl = await this.getCanvasAsDataURL({ selector });

		if (nonNullish(dataUrl)) {
			return getQRCodeValueFromDataURL({ dataUrl });
		}
	}

	protected async waitForModal({
		modalOpenButtonTestId,
		modalTestId
	}: WaitForModalParams): Promise<Locator> {
		await this.clickByTestId(modalOpenButtonTestId);
		const modal = this.#page.getByTestId(modalTestId);
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
		await this.#page.getByTestId(LOADER_MODAL).waitFor(options);
	}

	protected async waitForTokensInitialization(options?: WaitForLocatorOptions): Promise<void> {
		await this.#page.getByTestId(`${TOKEN_CARD}-ICP-ICP`).waitFor(options);
		await this.#page.getByTestId(`${TOKEN_CARD}-ETH-ETH`).waitFor(options);

		await this.#page.getByTestId(`${TOKEN_BALANCE}-ICP`).waitFor(options);
		await this.#page.getByTestId(`${TOKEN_BALANCE}-ETH`).waitFor(options);
	}

	protected async clickMenuItem({ menuItemTestId }: ClickMenuItemParams): Promise<void> {
		await this.clickByTestId(NAVIGATION_MENU_BUTTON);
		await this.waitForNavigationMenu();

		await this.clickByTestId(menuItemTestId);
	}

	protected async clickSelector({ selector }: SelectorOperationParams): Promise<void> {
		await this.#page.locator(selector).click();
	}

	protected async getLocatorByTestId({ testId }: TestIdOperationParams): Promise<Locator> {
		return await this.#page.getByTestId(testId);
	}

	async waitForTimeout(timeout: number): Promise<void> {
		await this.#page.waitForTimeout(timeout);
	}

	async waitForLoggedOutIndicator(): Promise<void> {
		await this.waitForLoginButton();
	}

	async waitForLoggedInIndicator(): Promise<void> {
		await this.#page.getByTestId(NAVIGATION_MENU_BUTTON).waitFor();
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

		await expect(modal).toHaveScreenshot();
	}

	async setCarouselFirstSlide(): Promise<void> {
		if (isNullish(this.promotionCarousel)) {
			this.promotionCarousel = new PromotionCarousel(this.#page);
		}

		await this.promotionCarousel.navigateToSlide(1);
		await this.promotionCarousel.freezeCarousel();
	}

	async waitForLoadState() {
		await this.#page.waitForLoadState('networkidle');
	}

	async navigateTo(testId: string): Promise<void> {
		if (await this.isVisibleByTestId(testId)) {
			await this.clickByTestId(testId);
		} else {
			const navigationMenuButton = this.#page.getByTestId(NAVIGATION_MENU_BUTTON);
			await navigationMenuButton.click();
			const navigationMenu = this.#page.getByTestId(NAVIGATION_MENU);
			await navigationMenu.getByTestId(testId).click();
		}
	}

	async activateTestnetSettings(): Promise<void> {
		await this.navigateTo(NAVIGATION_ITEM_SETTINGS);
		await this.clickByTestId(TESTNET_TOGGLE);
		await this.clickByTestId(NAVIGATION_ITEM_HOMEPAGE);
	}

	async takeScreenshot(): Promise<void> {
		await expect(this.#page).toHaveScreenshot({
			// creates a snapshot as a fullPage and not just certain parts.
			fullPage: true,
			// playwright can retry flaky tests in the amount of time set below.
			timeout: 5 * 60 * 1000
		});
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

	async checkIfStillLoggedIn(timeout = 10000): Promise<void> {
		await this.waitForLoggedInIndicator();

		await this.waitForTimeout(timeout);

		await this.waitForLoggedInIndicator();
	}

	async waitForLogout(): Promise<void> {
		await this.clickMenuItem({ menuItemTestId: LOGOUT_BUTTON });

		await this.waitForLoggedOutIndicator();
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

		const qrCodeOutputLocator = await this.getLocatorByTestId({
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

		await this.waitForLoaderModal();

		await this.waitForLoaderModal({ state: 'hidden', timeout: 60000 });

		await this.waitForTokensInitialization();

		await this.waitForLoadState();

		await this.setCarouselFirstSlide();

		await this.extendWaitForReady();
	}
}
