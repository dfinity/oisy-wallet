import type { StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';

const meta = {
	title: 'UI/Button',
	component: Button,
	tags: ['autodocs'],
	argTypes: {
		colorStyle: {
			control: 'select',
			options: [
				'primary',
				'secondary',
				'secondary-light',
				'tertiary',
				'tertiary-main-card',
				'tertiary-alt',
				'muted',
				'error',
				'success'
			],
			description: 'Button color style'
		},
		type: {
			control: 'select',
			options: ['submit', 'reset', 'button'],
			description: 'Button type attribute'
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the button is disabled'
		},
		loading: {
			control: 'boolean',
			description: 'Whether the button is in loading state'
		},
		loadingAsSkeleton: {
			control: 'boolean',
			description: 'Whether to show loading as skeleton'
		},
		fullWidth: {
			control: 'boolean',
			description: 'Whether the button should take full width'
		},
		link: {
			control: 'boolean',
			description: 'Whether the button should be styled as a link'
		},
		inlineLink: {
			control: 'boolean',
			description: 'Whether the button should be styled as an inline link'
		},
		paddingSmall: {
			control: 'boolean',
			description: 'Whether the button should have small padding'
		},
		testId: {
			control: 'text',
			description: 'Test ID for the button'
		},
		ariaLabel: {
			control: 'text',
			description: 'Aria label for the button'
		},
		styleClass: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	},
	args: {
		$$slots: {
			default: (anchor: HTMLElement) => {
				anchor.before('Button Text');
			}
		}
	}
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		colorStyle: 'primary',
		type: 'button'
	}
};

// Color Style Variants
export const Primary: Story = {
	args: {
		...Default.args,
		colorStyle: 'primary'
	},
	render: Default.render
};

export const Secondary: Story = {
	args: {
		...Default.args,
		colorStyle: 'secondary'
	},
	render: Default.render
};

export const SecondaryLight: Story = {
	args: {
		...Default.args,
		colorStyle: 'secondary-light'
	},
	render: Default.render
};

export const Tertiary: Story = {
	args: {
		...Default.args,
		colorStyle: 'tertiary'
	},
	render: Default.render
};

export const TertiaryMainCard: Story = {
	args: {
		...Default.args,
		colorStyle: 'tertiary-main-card'
	},
	render: Default.render
};

export const TertiaryAlt: Story = {
	args: {
		...Default.args,
		colorStyle: 'tertiary-alt'
	},
	render: Default.render
};

export const Muted: Story = {
	args: {
		...Default.args,
		colorStyle: 'muted'
	},
	render: Default.render
};

export const Error: Story = {
	args: {
		...Default.args,
		colorStyle: 'error'
	},
	render: Default.render
};

export const Success: Story = {
	args: {
		...Default.args,
		colorStyle: 'success'
	},
	render: Default.render
};

// State Variants
export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true
	},
	render: Default.render
};

export const Loading: Story = {
	args: {
		...Default.args,
		loading: true
	},
	render: Default.render
};

export const LoadingWithoutSkeleton: Story = {
	args: {
		...Default.args,
		loading: true,
		loadingAsSkeleton: false
	},
	render: Default.render
};

// Configuration Variants
export const FullWidth: Story = {
	args: {
		...Default.args,
		fullWidth: true
	},
	render: Default.render
};

export const AsLink: Story = {
	args: {
		...Default.args,
		link: true
	},
	render: Default.render
};

export const AsInlineLink: Story = {
	args: {
		...Default.args,
		inlineLink: true
	},
	render: Default.render
};

export const SmallPadding: Story = {
	args: {
		...Default.args,
		paddingSmall: true
	},
	render: Default.render
};

// Type Variants
export const SubmitButton: Story = {
	args: {
		...Default.args,
		type: 'submit'
	},
	render: Default.render
};

export const ResetButton: Story = {
	args: {
		...Default.args,
		type: 'reset'
	},
	render: Default.render
};
