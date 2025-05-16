import type { StoryObj } from '@storybook/svelte';
import ContactForm from './ContactForm.svelte';

const meta = {
	title: 'Contact/Contact Form',
	component: ContactForm,
	tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NewContact: Story = {
	args: { contact: {} }
};

export const ExistingAddress: Story = {
	args: {
		contact: {
			name: 'Jon Doe'
		}
	}
};
