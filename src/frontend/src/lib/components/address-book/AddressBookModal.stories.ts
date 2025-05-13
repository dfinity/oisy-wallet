import Button from '$lib/components/ui/Button.svelte';
import { modalStore } from '$lib/stores/modal.store';
import type { StoryObj } from '@storybook/svelte';
import { onMount } from 'svelte';
import AddressBookModal from './AddressBookModal.svelte';

const meta = {
	title: 'Address Book/AddressBookModal',
	component: AddressBookModal
};

export default meta;
type Story = StoryObj<typeof meta>;

const addressModalId = Symbol();

export const Default: Story = {
	render: () => {
		onMount(() => {
			modalStore.openAddressBook(addressModalId);
		});
		return {
			Component: Button,
			props: {
				$$slots: {
					default: (anchor: HTMLElement) => {
						anchor.before('Open Address Book Modal');
					}
				},
				$$events: {
					click: () => {
						modalStore.openAddressBook(addressModalId);
					}
				}
			}
		};
	}
};
