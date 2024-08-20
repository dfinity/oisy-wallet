import {
	HERO_ANIMATION_CANVAS,
	LOGIN_BUTTON,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constant';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { type Page } from '@playwright/test';
import { readCanisterIds } from '../../../vite.utils';
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
		const canisterIds = readCanisterIds({});
		const iiCanisterId = canisterIds.LOCAL_INTERNET_IDENTITY_CANISTER_ID;
		// eslint-disable-next-line no-console
		console.log({ canisterIds, iiCanisterId });
		await this._iiPage.waitReady({
			url: LOCAL_REPLICA_URL,
			...(iiCanisterId && { canisterId: iiCanisterId })
		});

		await this.waitForLoggedOut();

		await this._iiPage.signInWithNewIdentity();
	}

	async waitForLoggedIn(): Promise<void> {
		await this.signInWithNewIdentity();

		await this._page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();
	}
}
