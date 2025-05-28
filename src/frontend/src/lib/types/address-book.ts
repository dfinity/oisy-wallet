import type { AddressBookSteps } from '$lib/enums/progress-steps';

export type AddressBookModalParams = {
	step?:
		| {
				type: AddressBookSteps.SAVE_ADDRESS;
				address: string;
		  }
		| { type: AddressBookSteps.ADD_CONTACT };
};
