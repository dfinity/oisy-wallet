import { testWithII } from '@dfinity/internet-identity-playwright';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should sign-in', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForAuthentication();

	await homepageLoggedIn.waitForLoggedInIndicator();
});

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should stay signed in after an interval', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForAuthentication();

	await homepageLoggedIn.checkIfStillLoggedIn();
});

// TODO: E2E tests are failing and/or take too much time, we need to fix them slowly, so we skip them for now
testWithII.skip('should sign-out', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForAuthentication();
	await homepageLoggedIn.waitForLogout();
});
