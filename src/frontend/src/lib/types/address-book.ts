import type { AddressBookSteps } from '$lib/enums/progress-steps';

export interface AddressBookModalParams {
	// note: to add a different entrypoint, add another object type def as uniontype, e.g.
	// {
	// 		type: AddressBookSteps.SAVE_ADDRESS;
	// 		address: string;
	// } | {
	// 		type: AddressBookSteps.ANOTHER_ENTRYPOINT,
	//		someAddtionalData: string;
	// };
	entrypoint?: {
		type: AddressBookSteps.SAVE_ADDRESS;
		address: string;
		onComplete?: () => void;
	};
}
