import {
	HERO_ANIMATION_CANVAS,
	LOGIN_BUTTON,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constant';
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

	protected async waitForHomepageReady(): Promise<void> {
		await this.goto();
		await this.#page.getByTestId(LOGIN_BUTTON).waitFor();
		await this.hideHeroAnimation();
	}

	protected async waitForTokenSkeletonsInitialization(): Promise<void> {
		await this.#page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();
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
			// TODO: take this value from env vars
			canisterId: 'rdmx6-jaaaa-aaaaa-aaadq-cai'
		});

		await this.waitForHomepageReady();

		await this.#iiPage.signInWithNewIdentity();
	}

	/**
	 * @override
	 */
	async waitForReady(): Promise<void> {
		await this.waitForAuthentication();

		await this.waitForTokenSkeletonsInitialization();
	}
}
