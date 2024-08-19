import { testWithII } from '@dfinity/internet-identity-playwright';
import { HOMEPAGE_URL } from './shared/constants';

testWithII('should sign-in', async ({ page, iiPage }) => {
	await page.goto(HOMEPAGE_URL);

	await iiPage.signInWithNewIdentity();
});
