import IconSearchClose from '$lib/components/icons/lucide/IconSearchClose.svelte';
import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
import { render, screen } from '@testing-library/svelte';

describe('RoundedIcon', () => {
	const defaultProps = {
		icon: IconSearchClose
	};

	it('should apply default classes', () => {
		const { container } = render(RoundedIcon, { props: defaultProps });

		const wrapper = container.firstChild;

		expect(wrapper).toHaveClass('relative');
		expect(wrapper).toHaveClass('p-3');
		expect(wrapper).toHaveClass('bg-primary');
		expect(wrapper).toHaveClass('rounded-full');
		expect(wrapper).toHaveClass('ring-1');
		expect(wrapper).toHaveClass('ring-brand-subtle-20');
	});

	it('should apply custom color style', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				colorStyle: 'bg-secondary'
			}
		});

		const wrapper = container.firstChild;

		expect(wrapper).toHaveClass('bg-secondary');
		expect(wrapper).not.toHaveClass('bg-primary');
	});

	it('should apply custom position class', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				positionClass: 'absolute'
			}
		});

		const wrapper = container.firstChild;

		expect(wrapper).toHaveClass('absolute');
		expect(wrapper).not.toHaveClass('relative');
	});

	it('should apply custom padding class', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				paddingClass: 'p-4'
			}
		});

		const wrapper = container.firstChild;

		expect(wrapper).toHaveClass('p-4');
		expect(wrapper).not.toHaveClass('p-3');
	});

	it('should apply custom style class', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				styleClass: 'custom-style'
			}
		});

		const wrapper = container.firstChild;

		expect(wrapper).toHaveClass('custom-style');
	});

	it('should not apply opacity class when opacity is false', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				opacity: false
			}
		});

		const iconElement = container.querySelector('svg');

		expect(iconElement).not.toHaveClass('opacity-10');
	});

	it('should set custom size on icon', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				size: 24
			}
		});

		const iconElement = container.querySelector('svg');

		expect(iconElement).toHaveAttribute('width', '24');
		expect(iconElement).toHaveAttribute('height', '24');
	});

	it('should use string size value', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				size: '32'
			}
		});

		const iconElement = container.querySelector('svg');

		expect(iconElement).toHaveAttribute('width', '32');
		expect(iconElement).toHaveAttribute('height', '32');
	});

	it('should set aria-label when provided', () => {
		render(RoundedIcon, {
			props: {
				...defaultProps,
				ariaLabel: 'Search close icon'
			}
		});

		const wrapper = screen.getByLabelText('Search close icon');

		expect(wrapper).toBeInTheDocument();
	});

	it('should set data-tid when provided', () => {
		const { container } = render(RoundedIcon, {
			props: {
				...defaultProps,
				testId: 'test-rounded-icon'
			}
		});

		const wrapper = container.firstChild;

		expect(wrapper).toHaveAttribute('data-tid', 'test-rounded-icon');
	});
});
