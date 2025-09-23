import Radio from '$lib/components/ui/Radio.svelte';
import { render } from '@testing-library/svelte';

describe('Radio', () => {
	const props: { inputId: string; checked: boolean } = {
		inputId: 'id',
		checked: true
	};

	it('should render a container', () => {
		const { container } = render(Radio, {
			props
		});

		expect(container.querySelector('div.radio')).not.toBeNull();
	});

	it('should render an input', () => {
		const { container } = render(Radio, {
			props
		});

		const input: HTMLInputElement | null = container.querySelector('input');

		expect(input?.getAttribute('type')).toEqual('radio');
		expect(input?.getAttribute('id')).toEqual(props.inputId);
		expect(input?.hasAttribute('disabled')).toBeFalsy();
	});

	it('should render a disabled input', () => {
		const { container } = render(Radio, {
			props: { ...props, disabled: true }
		});

		const input: HTMLInputElement | null = container.querySelector('input');

		expect(input?.hasAttribute('disabled')).toBeTruthy();
	});

	it('should react to checked', async () => {
		const { container, rerender } = render(Radio, {
			props
		});

		let input: HTMLInputElement | null = container.querySelector('input');

		expect(input?.checked).toBeTruthy();

		await rerender({ ...props, checked: false });

		input = container.querySelector('input');

		expect(input?.checked).toBeFalsy();
	});
});
