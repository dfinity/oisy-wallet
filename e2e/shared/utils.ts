import { THREE_BACKGROUND_CANVAS } from '$lib/constants/test-ids.constant';
import type { Page } from '@playwright/test';

export const hideHeroAnimation = async (page: Page): Promise<void> => {
	await page
		.getByTestId(THREE_BACKGROUND_CANVAS)
		.evaluate((element) => (element.style.display = 'none'));
};

// TODO: use readCanisterIds to get the II canister ID
export const getInternetIdentityCanisterId = (): string => 'rdmx6-jaaaa-aaaaa-aaadq-cai';
