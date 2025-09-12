import { testWithII } from '@dfinity/internet-identity-playwright';
import { HomepageLoggedIn } from './utils/pages/homepage.page';

testWithII('should sign-in', async ({ page, iiPage }) => {
	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });
	const client = await page.context().newCDPSession(page);
	await client.send('WebAuthn.enable');
	const result = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: false,
		},
	});
	const authenticatorId = result.authenticatorId;

	await homepageLoggedIn.waitForAuthentication();

	await homepageLoggedIn.waitForLoggedInIndicator();

	await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
});

//testWithII('should stay signed in after an interval', async ({ page, iiPage }) => {
//	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });
//
//	await homepageLoggedIn.waitForAuthentication();
//
//	await homepageLoggedIn.checkIfStillLoggedIn();
//});

//testWithII('should sign-out', async ({ page, iiPage }) => {
//	const homepageLoggedIn = new HomepageLoggedIn({ page, iiPage });
//
//	await homepageLoggedIn.waitForAuthentication();
//	await homepageLoggedIn.waitForLogout();
//});
 