import { THREE_BACKGROUND_CANVAS } from '$lib/constants/test-ids.constant';
import type { Page } from '@playwright/test';

export const hideHeroAnimation = async (page: Page): Promise<void> => {
	await page
		.getByTestId(THREE_BACKGROUND_CANVAS)
		.evaluate((element) => (element.style.display = 'none'));
};

export const getInternetIdentityCanisterId = (): string => {
	// TODO readCanisterIds to get the II canister ID
	return 'rdmx6-jaaaa-aaaaa-aaadq-cai';
};
