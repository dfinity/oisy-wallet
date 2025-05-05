import type { StoryObj } from '@storybook/svelte';
import Input from './Input.svelte';

const meta = {
	title: 'UI/Input',
	component: Input,
	tags: ['autodocs'],
	argTypes: {
		inputType: {
			control: 'select',
			options: [undefined, 'text', 'number', 'icp', 'currency'],
			description: 'Type of input field'
		}
	}
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: 'field1',
		inputType: 'text',
		placeholder: 'Some field'
	}
};

export const WithReset: Story = {
	args: {
		...Default.args,
		showResetButton: true
	}
};

export const WithValueReset: Story = {
	args: {
		...WithReset.args,
		value: 'Default value'
	}
};

// Input type examples
export const TextInput: Story = {
	args: {
		name: 'text-input',
		inputType: 'text',
		placeholder: 'Text input example'
	}
};

export const NumberInput: Story = {
	args: {
		...Default.args,
		inputType: 'number',
		placeholder: '0.00'
	}
};

export const IcpInput: Story = {
	args: {
		...Default.args,
		inputType: 'icp',
		placeholder: 'Enter ICP amount'
	}
};

export const CurrencyInput: Story = {
	args: {
		...Default.args,
		inputType: 'currency',
		placeholder: 'Enter amount'
	}
};
