import type { Address } from '$lib/types/address';
import type { ContactUi } from '$lib/types/contact';

export type NetworkContacts = Record<
	string,
	{
		address: Address;
		contact: ContactUi;
	}
>;
