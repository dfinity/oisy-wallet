import type { NonEmptyArray } from '$lib/types/utils';

// Available contact background colors
export const CONTACT_BACKGROUND_COLORS: NonEmptyArray<string> = [
	`bg-contact-1`,
	`bg-contact-2`,
	`bg-contact-3`,
	`bg-contact-4`,
	`bg-contact-5`,
	`bg-contact-6`,
	`bg-contact-7`,
	`bg-contact-8`,
	`bg-contact-9`
];

// Available contact text colors
export const CONTACT_TEXT_COLORS: NonEmptyArray<string> = [
	`text-contact-1`,
	`text-contact-2`,
	`text-contact-3`,
	`text-contact-4`,
	`text-contact-5`,
	`text-contact-6`,
	`text-contact-7`,
	`text-contact-8`,
	`text-contact-9`
];

// Loading the contacts is tried this many times before the user is told it failed.
export const CONTACTS_LOAD_MAX_ATTEMPTS = 3;

// The wait before a retry doubles each time: 2 s before the second attempt, 4 s before the third.
export const CONTACTS_LOAD_RETRY_BASE_DELAY = 2_000;
