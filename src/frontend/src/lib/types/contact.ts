import type { ContactSchema } from '$env/schema/env-contact.schema';
import type { Modal } from '$lib/stores/modal.store';
import type { z } from 'zod';

export type Contact = z.infer<typeof ContactSchema>;

export type ContactModalData<T> = T & {
	contact?: Contact;
	previousModal?: Modal<T>['type'];
};
