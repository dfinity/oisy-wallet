import {
	HERO_ANIMATION_CANVAS,
	LOGIN_BUTTON,
	TOKENS_SKELETONS_INITIALIZED
} from '$lib/constants/test-ids.constant';
import { type InternetIdentityPage } from '@dfinity/internet-identity-playwright';
import { type Page } from '@playwright/test';
import { HOMEPAGE_URL, LOCAL_REPLICA_URL } from '../constants/e2e.constants';

type HomepageParams = {
	page: Page;
};

type HomepageLoggedInParams = {
	iiPage: InternetIdentityPage;
} & HomepageParams;

export class Homepage {
	readonly page: Page;

	constructor({ page }: HomepageParams) {
		this.page = page;
	}

	protected async hideHeroAnimation(): Promise<void> {
		await this.page
			.getByTestId(HERO_ANIMATION_CANVAS)
			.evaluate((element) => (element.style.display = 'none'));
	}

	async goto(): Promise<void> {
		await this.page.goto(HOMEPAGE_URL);
	}

	async waitForLoggedOut(): Promise<void> {
		await this.goto();
		await this.page.getByTestId(LOGIN_BUTTON).waitFor();
		await this.hideHeroAnimation();
	}
}

export class HomepageLoggedIn extends Homepage {
	readonly iiPage: InternetIdentityPage;

	constructor({ page, iiPage }: HomepageLoggedInParams) {
		super({ page });

		this.iiPage = iiPage;
	}

	async signInWithNewIdentity(): Promise<void> {
		await this.iiPage.waitReady({
			url: LOCAL_REPLICA_URL,
			// TODO: take this value from vite.utils or FE constants
			canisterId: 'rdmx6-jaaaa-aaaaa-aaadq-cai'
		});

		await this.waitForLoggedOut();

		await this.iiPage.signInWithNewIdentity();
	}

	async waitForLoggedIn(): Promise<void> {
		await this.signInWithNewIdentity();

		await this.page.getByTestId(TOKENS_SKELETONS_INITIALIZED).waitFor();
	}
}
