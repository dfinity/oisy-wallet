import type { StoryObj } from '@storybook/svelte';
import EmptyAddressBook from './EmptyAddressBook.svelte';

const meta = {
	title: 'Address Book/Components/EmptyAddressBook',
	component: EmptyAddressBook
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};
