import PillButton from '$lib/components/ui/PillButton.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('PillButton', () => {
	const createTextSnippet = (text: string) =>
		createRawSnippet(() => ({
			render: () => `<span>${text}</span>`
		}));

	it('should render children content', () => {
		const { getByText } = render(PillButton, {
			props: { children: createTextSnippet('Crypto') }
		});

		expect(getByText('Crypto')).toBeInTheDocument();
	});

	it('should render as a button element', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should have pill shape classes', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('rounded-full')).toBeTruthy();
		expect(button?.classList.contains('text-xs')).toBeTruthy();
	});

	it('should apply unselected styles by default', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('text-secondary')).toBeTruthy();
		expect(button?.classList.contains('bg-brand-primary')).toBeFalsy();
	});

	it('should apply selected styles when selected is true', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), selected: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('bg-brand-primary')).toBeTruthy();
		expect(button?.classList.contains('text-primary-inverted')).toBeTruthy();
		expect(button?.classList.contains('text-secondary')).toBeFalsy();
	});

	it('should give an unselected accented pill the same border and fill as any other', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('border-primary')).toBeTruthy();
		expect(button?.classList.contains('bg-primary')).toBeTruthy();
		expect(button?.classList.contains('border-brand-subtle-20')).toBeFalsy();
		expect(button?.classList.contains('bg-brand-subtle-20')).toBeFalsy();
	});

	it('should keep the regular text colour on an accented pill', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('text-secondary')).toBeTruthy();
		expect(button?.classList.contains('text-brand-primary')).toBeFalsy();
	});

	it('should hover an accented pill with the same wash as any other', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('hover:bg-brand-subtle-10')).toBeTruthy();
		expect(button?.classList.contains('hover:border-brand-subtle-30')).toBeFalsy();
	});

	it('should apply the regular selected styles when an accented pill is selected', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true, selected: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('bg-brand-primary')).toBeTruthy();
		expect(button?.classList.contains('text-primary-inverted')).toBeTruthy();
		expect(button?.classList.contains('bg-brand-subtle-20')).toBeFalsy();
		expect(button?.getAttribute('aria-pressed')).toBe('true');
	});

	it('should run the border lap on an unselected accented pill', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		expect(button?.querySelector('.pill-lap')).not.toBeNull();
	});

	it('should not run the border lap when an accented pill is selected', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true, selected: true }
		});

		const button = container.querySelector('button');

		expect(button?.querySelector('.pill-lap')).toBeNull();
	});

	it('should not run the border lap without accent', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button?.querySelector('.pill-lap')).toBeNull();
	});

	it('should replay the border laps when the pointer enters', async () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		assertNonNullish(button);

		const firstLap = button.querySelector('.pill-lap');

		await fireEvent.pointerEnter(button, { pointerType: 'mouse' });

		const replayedLap = button.querySelector('.pill-lap');

		expect(replayedLap).not.toBeNull();
		expect(replayedLap).not.toBe(firstLap);
	});

	it('should not restart the border laps while they are running', async () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		assertNonNullish(button);

		const runningLap = button.querySelector('.pill-lap');

		assertNonNullish(runningLap);

		await fireEvent.animationStart(runningLap);
		await fireEvent.pointerEnter(button, { pointerType: 'mouse' });

		expect(button.querySelector('.pill-lap')).toBe(runningLap);

		await fireEvent.animationEnd(runningLap);
		await fireEvent.pointerEnter(button, { pointerType: 'mouse' });

		expect(button.querySelector('.pill-lap')).not.toBe(runningLap);
	});

	it('should not replay the border laps on touch', async () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), accent: true }
		});

		const button = container.querySelector('button');

		assertNonNullish(button);

		const firstLap = button.querySelector('.pill-lap');

		await fireEvent.pointerEnter(button, { pointerType: 'touch' });

		expect(button.querySelector('.pill-lap')).toBe(firstLap);
	});

	it('should call onclick handler when clicked', async () => {
		const onClick = vi.fn();

		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Click me'), onClick }
		});

		const button = container.querySelector('button');

		expect(button).toBeDefined();

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(onClick).toHaveBeenCalledOnce();
	});
});
