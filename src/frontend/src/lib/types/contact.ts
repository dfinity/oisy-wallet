import type { Modal } from '$lib/stores/modal.store';

export interface Contact {
	name: string;
}

export type ContactModalData<T> = T & {
	contact?: Contact;
	previousModal?: Modal<T>['type'];
};
