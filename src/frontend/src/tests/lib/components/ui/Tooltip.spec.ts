import TooltipListTest from '$tests/lib/components/ui/TooltipListTest.svelte';
import TooltipTest from '$tests/lib/components/ui/TooltipTest.svelte';
import { render } from '@testing-library/svelte';

describe('Tooltip', () => {
	const id = 'tid';
	const idPrefix = 'id-prefix';

	it('should render target content', () => {
		const { container } = render(TooltipTest, { text: 'text', id });

		const element: HTMLParagraphElement | null = container.querySelector('p');

		expect(element).toBeInTheDocument();
		expect(element?.innerHTML).toBe('content');
	});

	it('should render target content without extra whitespace', () => {
		const { container } = render(TooltipTest, { text: 'text', id });

		const element: HTMLDivElement | null = container.querySelector(
			"[data-tid='tooltip-component']"
		);

		expect(element).toBeInTheDocument();
		expect(`'${element?.textContent}'`).toBe("'content'");
	});

	it('should render tooltip text content', () => {
		const { baseElement } = render(TooltipTest, { text: 'text', id });

		const tooltipElement = baseElement.querySelector('.tooltip');

		expect(tooltipElement).toBeInTheDocument();
		expect(tooltipElement?.classList).not.toContain('not-rendered');
		expect(tooltipElement?.textContent).toBe('text');
	});

	it('should render tooltip snippet content', () => {
		const { baseElement } = render(TooltipTest, { slotText: 'slot text', id });

		const tooltipElement = baseElement.querySelector('.tooltip');

		expect(tooltipElement).toBeInTheDocument();
		expect(tooltipElement?.classList).not.toContain('not-rendered');

		const tooltipSlot = tooltipElement?.querySelector('div');

		expect(tooltipSlot).toBeInTheDocument();
		expect(tooltipSlot?.textContent).toBe('slot text');
	});

	it('should render aria-describedby and relevant id', () => {
		const { baseElement } = render(TooltipTest, { text: 'text', id });

		expect(baseElement.querySelector("[aria-describedby='tid']")).toBeInTheDocument();
		expect(baseElement.querySelector("[id='tid']")).toBeInTheDocument();
	});

	it('should render different ID per tooltip when using idPrefix', () => {
		render(TooltipTest, { text: 'text', idPrefix });
		const { baseElement } = render(TooltipTest, { text: 'text', idPrefix });
		const tooltipTargets = baseElement.querySelectorAll('.tooltip-target');

		expect(tooltipTargets).toHaveLength(2);

		const describedBy1 = tooltipTargets[0].getAttribute('aria-describedby');
		const describedBy2 = tooltipTargets[1].getAttribute('aria-describedby');

		expect(describedBy1).not.toEqual(describedBy2);
		expect(describedBy1).toMatch(new RegExp(`^${idPrefix}-\\d+$`));
		expect(describedBy2).toMatch(new RegExp(`^${idPrefix}-\\d+$`));
		expect(baseElement.querySelector(`[id="${describedBy1}"]`)).toBeInTheDocument();
		expect(baseElement.querySelector(`[id="${describedBy2}"]`)).toBeInTheDocument();
	});

	it('should render different ID per tooltip when not specifying any id or idPrefix', () => {
		render(TooltipTest, { text: 'text' });
		const { baseElement } = render(TooltipTest, { text: 'text' });
		const tooltipTargets = baseElement.querySelectorAll('.tooltip-target');

		expect(tooltipTargets).toHaveLength(2);

		const describedBy1 = tooltipTargets[0].getAttribute('aria-describedby');
		const describedBy2 = tooltipTargets[1].getAttribute('aria-describedby');

		expect(describedBy1).not.toEqual(describedBy2);
		expect(baseElement.querySelector(`[id="${describedBy1}"]`)).toBeInTheDocument();
		expect(baseElement.querySelector(`[id="${describedBy2}"]`)).toBeInTheDocument();
	});

	it('should use id if both id and idPrefix are given', () => {
		const { baseElement } = render(TooltipTest, { text: 'text', id, idPrefix });
		const tooltipTarget = baseElement.querySelector('.tooltip-target');
		const describedBy = tooltipTarget?.getAttribute('aria-describedby');

		expect(describedBy).toBe(id);
		expect(baseElement.querySelector(`[id="${describedBy}"]`)).toBeInTheDocument();
	});

	it('should hide with empty text', () => {
		const { baseElement } = render(TooltipTest, { text: '', id });

		// Content should still be rendered.
		const element: HTMLParagraphElement | null = baseElement.querySelector('p');

		expect(element).toBeInTheDocument();
		expect(element?.innerHTML).toBe('content');

		// But no tooltip should be rendered.
		const tooltipElement = baseElement.querySelector('.tooltip');

		expect(tooltipElement?.classList).toContain('not-rendered');
	});

	it('should hide with undefined text', () => {
		const { baseElement } = render(TooltipTest, { text: undefined, id });

		// Content should still be rendered.
		const element: HTMLParagraphElement | null = baseElement.querySelector('p');

		expect(element).toBeInTheDocument();
		expect(element?.innerHTML).toBe('content');

		// But no tooltip should be rendered.
		const tooltipElement = baseElement.querySelector('.tooltip');

		expect(tooltipElement?.classList).toContain('not-rendered');
	});

	it('should place tooltip directly in body element to evade overflow:hidden', () => {
		const { baseElement } = render(TooltipTest, { text: undefined, id });

		const tooltipElement = baseElement.querySelector('.tooltip');

		expect(tooltipElement?.parentElement).toBe(document.body);
	});

	it('should keep tooltips directly in body when rearranged', async () => {
		const tooltip1 = { text: 'tooltip1', id: 'id1' };
		const tooltip2 = { text: 'tooltip2', id: 'id2' };

		const { baseElement, rerender } = render(TooltipListTest, {
			props: { list: [tooltip1, tooltip2] }
		});

		{
			const tooltipElements = baseElement.querySelectorAll('.tooltip');

			expect(tooltipElements).toHaveLength(2);
			expect(tooltipElements[0].parentElement).toBe(document.body);
			expect(tooltipElements[1].parentElement).toBe(document.body);
		}

		// After rearranging the components, the tooltips should still be direct
		// children of the body.
		await rerender({ list: [tooltip2, tooltip1] });

		{
			const tooltipElements = baseElement.querySelectorAll('.tooltip');

			expect(tooltipElements).toHaveLength(2);
			expect(tooltipElements[0].parentElement).toBe(document.body);
			expect(tooltipElements[1].parentElement).toBe(document.body);
		}
	});
});
