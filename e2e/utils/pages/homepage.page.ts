import {
	HERO_ANIMATION_CANVAS,
	LOGIN_BUTTON,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constant';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { type Page } from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';

export class Homepage {
	protected readonly _page: Page;

	constructor(page: Page) {
		this._page = page;
	}

	protected async hideHeroAnimation(): Promise<void> {
		await this._page
			.getByTestId(HERO_ANIMATION_CANVAS)
			.evaluate((element) => (element.style.display = 'none'));
	}

	get page(): Page {
		return this._page;
	}

	async goto(): Promise<void> {
		await this._page.goto(HOMEPAGE_URL);
	}

	async waitForLoggedOut(): Promise<void> {
		await this.goto();
		await this._page.getByTestId(LOGIN_BUTTON).waitFor();
		await this.hideHeroAnimation();
	}
}

export class HomepageLoggedIn extends Homepage {
	private readonly _iiPage: InternetIdentityPage;

	constructor(page: Page, iiPage: InternetIdentityPage) {
		super(page);

		this._iiPage = iiPage;
	}

	async signInWithNewIdentity(): Promise<void> {
		await this._iiPage.waitReady({
			url: LOCAL_REPLICA_URL,
			// TODO: take this value from vite.utils or FE constants
			canisterId: 'rdmx6-jaaaa-aaaaa-aaadq-cai'
		});

		await this.waitForLoggedOut();

		await this._iiPage.signInWithNewIdentity();
	}

	async waitForLoggedIn(): Promise<void> {
		await this.signInWithNewIdentity();

		await this._page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();
	}
}
