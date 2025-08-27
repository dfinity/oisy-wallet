import { AddressBookSteps } from '$lib/enums/progress-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

export const AddressBookWizardSteps = ({
	i18n
}: WizardStepsParams): WizardSteps<AddressBookSteps> => [
	{
		name: AddressBookSteps.ADDRESS_BOOK,
		title: i18n.address_book.text.title
	},
	{
		name: AddressBookSteps.SAVE_ADDRESS,
		title: i18n.address.save.title
	},
	{
		name: AddressBookSteps.CREATE_CONTACT,
		title: i18n.address_book.create_contact.title
	},
	{
		name: AddressBookSteps.SHOW_CONTACT,
		title: i18n.address_book.show_contact.title
	},
	{
		name: AddressBookSteps.EDIT_CONTACT,
		title: i18n.address_book.edit_contact.title
	},
	{
		name: AddressBookSteps.EDIT_CONTACT_NAME,
		title: i18n.contact.form.add_new_contact
	},
	{
		name: AddressBookSteps.DELETE_CONTACT,
		title: i18n.contact.delete.title
	},
	{
		name: AddressBookSteps.SHOW_ADDRESS,
		// The title will be replaced with the name. No title is needed here.
		title: ''
	},
	{
		name: AddressBookSteps.EDIT_ADDRESS,
		title: i18n.address_book.edit_contact.title
	},
	{
		name: AddressBookSteps.QR_CODE_SCAN,
		title: i18n.address.qr.title
	},
	{
		name: AddressBookSteps.DELETE_ADDRESS,
		title: i18n.address.delete.title
	}
];