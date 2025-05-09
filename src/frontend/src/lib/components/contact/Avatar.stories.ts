import Avatar from '$lib/components/contact/Avatar.svelte';
import type { Meta, StoryObj } from '@storybook/svelte';

const meta = {
	title: 'Contact/Avatar',
	component: Avatar,
	tags: ['autodocs']
} satisfies Meta<Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: 'Dr. Grace Augustine'
	}
};

export const DefaultXl: Story = {
	args: {
		...Default.args,
		variant: 'xl'
	}
};

export const DefaultLg: Story = {
	args: {
		...Default.args,
		variant: 'lg'
	}
};

export const DefaultMd: Story = {
	args: {
		...Default.args,
		variant: 'md'
	}
};

export const DefaultSm: Story = {
	args: {
		...Default.args,
		variant: 'sm'
	}
};

export const DefaultXs: Story = {
	args: {
		...Default.args,
		variant: 'xs'
	}
};

export const EmptyName: Story = {
	args: {
		...Default.args,
		name: ''
	}
};

export const OneWordName: Story = {
	args: {
		...Default.args,
		name: 'John'
	}
};

export const TwoWordsName: Story = {
	args: {
		...Default.args,
		name: 'John Doe'
	}
};

export const ThreeWordsName: Story = {
	args: {
		...Default.args,
		name: 'John Middle Doe'
	}
};
