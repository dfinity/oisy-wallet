import { testWithII } from '@dfinity/internet-identity-playwright';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

testWithII('should sign-in', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForAuthentication();
});

testWithII('should sign-out', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });

	await homepageLoggedIn.waitForAuthentication();
	await homepageLoggedIn.waitForLogout();
});
