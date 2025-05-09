import ModalDecorator from '$lib/decorators/ModalDecorator.svelte';
import type { StoryObj } from '@storybook/svelte';
import AddContactStep from './AddContactStep.svelte';

const meta = {
	title: 'Address Book/Steps/AddContactStep',
	component: AddContactStep,
	decorators: [() => ModalDecorator]
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};
