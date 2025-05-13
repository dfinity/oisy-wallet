# Storybook for OISY Wallet

This directory contains the configuration for Storybook, a tool for developing and documenting UI components in isolation.

## Running Storybook

To start Storybook locally, run:

```bash
npm run storybook
```

This will start Storybook on port 6006. You can access it at http://localhost:6006.

## Building Storybook

To build a static version of Storybook, run:

```bash
npm run build-storybook
```

This will create a `storybook-static` directory with the built Storybook that can be deployed to a static hosting service.

## Creating Stories

Stories are located alongside their components with a `.stories.ts` or `.stories.svelte` extension. For example, the Button component has a corresponding `Button.stories.ts` file.

### Example Story

```typescript
// MyComponent.stories.ts
import type { Meta, StoryObj } from '@storybook/svelte';
import MyComponent from './MyComponent.svelte';

const meta = {
	title: 'Path/To/MyComponent',
	component: MyComponent,
	tags: ['autodocs'],
	argTypes: {
		// Define the props of your component
		prop1: { control: 'text' },
		prop2: { control: 'boolean' }
	}
} satisfies Meta<MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		prop1: 'Default value',
		prop2: false
	}
};

export const Variant: Story = {
	args: {
		prop1: 'Variant value',
		prop2: true
	}
};
```

## Configuration Files

- `main.ts`: The main configuration file for Storybook
- `preview.ts`: Configuration for the Storybook preview iframe
- `tailwind.css`: Tailwind CSS imports for Storybook
- `postcss.config.mjs`: PostCSS configuration for Storybook
