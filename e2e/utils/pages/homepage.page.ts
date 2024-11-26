import {
	AMOUNT_DATA,
	LOADER_MODAL,
	LOGIN_BUTTON,
	LOGOUT_BUTTON,
	NAVIGATION_MENU,
	NAVIGATION_MENU_BUTTON,
	RECEIVE_TOKENS_MODAL,
	RECEIVE_TOKENS_MODAL_OPEN_BUTTON,
	RECEIVE_TOKENS_MODAL_QR_CODE_OUTPUT,
	TOKEN_BALANCE,
	TOKEN_CARD
} from '$lib/constants/test-ids.constants';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { nonNullish } from '@dfinity/utils';
import {
	expect,
	type BrowserContext,
	type Locator,
	type Page,
	type ViewportSize
} from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';
import { getQRCodeValueFromDataURL } from '../qr-code.utils';
import { getReceiveTokensModalQrCodeButtonSelector } from '../selectors.utils';

interface HomepageParams {
	page: Page;
	context?: BrowserContext;
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

interface NavigateToTokenParams {
	token: string;
	network: string;
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
	readonly #context?: BrowserContext;
	readonly #viewportSize?: ViewportSize;

	protected constructor({ page, context, viewportSize }: HomepageParams) {
		this.#page = page;
		this.#context = context;
		this.#viewportSize = viewportSize;
	}

	protected async clickByTestId(testId: string): Promise<void> {
		await this.#page.getByTestId(testId).click();
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
		await this.#page.locator(selector).innerHTML();

		if (await this.isSelectorVisible({ selector })) {
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
		await this.#page.getByTestId(`${TOKEN_CARD}-ICP`).waitFor(options);
		await this.#page.getByTestId(`${TOKEN_CARD}-ETH`).waitFor(options);

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

	async waitForModalToDisappear({ testId }: TestIdOperationParams): Promise<void> {
		await this.#page.getByTestId(testId).waitFor({ state: 'detached' });
	}

	async waitForBy({ testId }: TestIdOperationParams): Promise<void> {
		await this.#page.getByTestId(testId).waitFor();
	}

	async clickBy({ testId }: TestIdOperationParams): Promise<void> {
		await this.#page.getByTestId(testId).click();
	}

	async elementExistsBy({ testId }: TestIdOperationParams): Promise<boolean> {
		return await this.#page
			.getByTestId(testId)
			.isVisible()
			.catch(() => false);
	}

	getBalance(): Locator {
		return this.#page.getByTestId(AMOUNT_DATA);
	}

	async getInputValueBy({ testId }: TestIdOperationParams): Promise<string | undefined> {
		return await this.#page.getByTestId(testId).inputValue();
	}

	async setInputValueByTestId({
		testId,
		value
	}: TestIdOperationParams & { value: string }): Promise<void> {
		await this.#page.getByTestId(testId).fill(value);
	}

	async clickCopyButton({ testId }: TestIdOperationParams): Promise<string | undefined> {
		if (this.#context === undefined) {
			throw new Error('Browser context is not defined');
		}
		await this.#context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await this.#page.getByTestId(testId).click();

		return await this.#page.evaluate(async () => {
			return await navigator.clipboard.readText();
		});
	}

	async navigateToToken({ token, network }: NavigateToTokenParams): Promise<void> {
		const url = new URL(this.#page.url());

		url.pathname = '/transactions/';

		url.searchParams.set('token', token);
		url.searchParams.set('network', network);

		await this.#page.goto(url.toString());
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
	}
}

export class HomepageLoggedIn extends Homepage {
	readonly #iiPage: InternetIdentityPage;

	constructor({ page, context, iiPage, viewportSize }: HomepageLoggedInParams) {
		super({ page, context, viewportSize });

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

		await this.extendWaitForReady();
	}
}
