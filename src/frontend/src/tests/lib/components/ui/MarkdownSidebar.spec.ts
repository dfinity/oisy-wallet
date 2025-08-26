import MarkdownSidebar from '$lib/components/ui/MarkdownSidebar.svelte';
import type { MarkdownBlockType } from '$lib/types/markdown';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { cleanup, render, waitFor } from '@testing-library/svelte';

// ---- Mock IntersectionObserver ----
interface IOEntry {
	target: Element;
	isIntersecting: boolean;
	intersectionRatio?: number;
}
let observedElements: Element[] = [];
let ioCallbacks: ((entries: IOEntry[]) => void)[] = [];

class MockIntersectionObserver {
	private cb: (entries: IOEntry[]) => void;
	constructor(cb: (entries: IOEntry[]) => void) {
		this.cb = cb;
		ioCallbacks.push(cb);
	}
	observe(el: Element) {
		observedElements.push(el);
	}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// Helper to trigger all IO callbacks
const triggerIntersect = (targets: Element[]) => {
	const entries = targets.map((t) => ({ target: t, isIntersecting: true, intersectionRatio: 1 }));
	ioCallbacks.forEach((cb) => cb(entries));
};

// ---- Helpers to attach real <h3 id="..."> into the document ----
const insertHeadingsIntoDOM = (blocks: MarkdownBlockType[]) => {
	blocks.forEach(({ id, text }) => {
		if (nonNullish(id)) {
			const h = document.createElement('h3');
			h.id = id;
			h.textContent = text;
			document.body.appendChild(h);
		}
	});
};

describe('MarkdownSidebar', () => {
	beforeEach(() => {
		observedElements = [];
		ioCallbacks = [];
	});

	afterEach(() => {
		cleanup();
		// Clean any headings we appended
		document.body.querySelectorAll('h3').forEach((h) => h.remove());
	});

	it('renders links for headings with correct hrefs and highlights the first by default', async () => {
		const headings: MarkdownBlockType[] = [
			{ type: 'header', text: 'Acceptance of Terms', id: 'heading-1' },
			{ type: 'header', text: 'Description of our Services', id: 'heading-2' },
			{ type: 'header', text: 'Account Access and Security', id: 'heading-3' }
		];

		// Put real <h3> elements in the DOM so the component can observe them
		insertHeadingsIntoDOM(headings);

		const { getByRole } = render(MarkdownSidebar, {
			props: { headings }
		});

		// Links rendered with correct text and hrefs
		const link1 = getByRole('link', { name: 'Acceptance of Terms' }) as HTMLAnchorElement;
		const link2 = getByRole('link', {
			name: 'Description of our Services'
		}) as HTMLAnchorElement;
		const link3 = getByRole('link', {
			name: 'Account Access and Security'
		}) as HTMLAnchorElement;

		// Use getAttribute to avoid jsdom absolute URL normalization
		expect(link1.getAttribute('href')).toBe('#heading-1');
		expect(link2.getAttribute('href')).toBe('#heading-2');
		expect(link3.getAttribute('href')).toBe('#heading-3');

		// First item should be highlighted initially (activeId is undefined => index === 0)
		const span1 = link1.querySelector('span');

		expect(span1).toHaveClass('text-primary');

		const span2 = link2.querySelector('span');

		expect(span2).not.toHaveClass('text-primary');

		const span3 = link3.querySelector('span');

		expect(span3).not.toHaveClass('text-primary');

		// Component should start observing the actual <h3> nodes
		const h1 = document.getElementById('heading-1');
		assertNonNullish(h1);
		const h2 = document.getElementById('heading-2');
		assertNonNullish(h2);
		const h3 = document.getElementById('heading-3');
		assertNonNullish(h3);

		expect(observedElements).toEqual(expect.arrayContaining([h1, h2, h3]));

		// Simulate that heading-2 becomes the visible one
		triggerIntersect([h2]);

		await waitFor(() => {
			expect(span2).toHaveClass('text-primary');
			expect(span1).not.toHaveClass('text-primary');
			expect(span3).not.toHaveClass('text-primary');
		});

		// Now simulate heading-3 intersecting
		triggerIntersect([h3]);

		await waitFor(() => {
			expect(span3).toHaveClass('text-primary');
			expect(span1).not.toHaveClass('text-primary');
			expect(span2).not.toHaveClass('text-primary');
		});
	});
});
