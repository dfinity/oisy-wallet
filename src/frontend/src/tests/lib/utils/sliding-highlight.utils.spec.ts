import { slidingHighlight } from '$lib/utils/sliding-highlight.utils';

// jsdom has no layout: give each row the box a browser would report.
const place = ({ row, top, height }: { row: HTMLElement; top: number; height: number }) => {
	row.getBoundingClientRect = () => new DOMRect(0, top, 200, height);
};

const mount = ({ scrollingList = false }: { scrollingList?: boolean } = {}) => {
	const node = document.createElement('div');
	node.innerHTML = `
		<ul ${scrollingList ? 'style="overflow-y: auto"' : ''}>
			<li><button>First</button></li>
			<li><button>Second</button></li>
			<li aria-disabled="true"><button>Disabled</button></li>
		</ul>
		<input name="filter" />
	`;
	document.body.append(node);

	const rows = Array.from(node.querySelectorAll('li'));
	rows.forEach((row, index) => place({ row, top: index * 36, height: 36 }));

	return { node, rows, input: node.querySelector('input') as HTMLInputElement };
};

const pointer = ({
	type,
	target,
	pointerType = 'mouse'
}: {
	type: string;
	target: Element;
	pointerType?: string;
}) => {
	const event = new MouseEvent(type, { bubbles: type !== 'pointerleave' });
	Object.defineProperty(event, 'pointerType', { value: pointerType });
	target.dispatchEvent(event);
};

const highlightOf = (node: HTMLElement) => node.querySelector<HTMLElement>('.sliding-highlight');

describe('slidingHighlight', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('marks its host and does nothing else until a row is hovered', () => {
		const { node } = mount();
		slidingHighlight(node, true);

		expect(node).toHaveAttribute('data-sliding-highlight');
		expect(highlightOf(node)).toBeNull();
	});

	it('appears in place on the hovered row, then slides to the next one', () => {
		const { node, rows } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[1] });

		const highlight = highlightOf(node);

		expect(highlight).toHaveClass('visible');
		expect(highlight).not.toHaveClass('instant');
		expect(highlight?.style.getPropertyValue('--highlight-y')).toBe('36px');
		expect(highlight?.style.getPropertyValue('--highlight-height')).toBe('36px');

		pointer({ type: 'pointerover', target: rows[0].querySelector('button') as Element });

		expect(highlightOf(node)).toBe(highlight);
		expect(highlight?.style.getPropertyValue('--highlight-y')).toBe('0px');
	});

	it('ignores touch, which has no hover', () => {
		const { node, rows } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0], pointerType: 'touch' });

		expect(highlightOf(node)).toBeNull();
	});

	it('skips disabled rows and hides over anything that is not a row', () => {
		const { node, rows, input } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });
		pointer({ type: 'pointerover', target: rows[2] });

		expect(highlightOf(node)).not.toHaveClass('visible');

		pointer({ type: 'pointerover', target: rows[0] });
		pointer({ type: 'pointerover', target: input });

		expect(highlightOf(node)).not.toHaveClass('visible');
	});

	it('hides when the pointer leaves, then parks at the top so it adds no scroll space', () => {
		vi.useFakeTimers();
		const { node, rows } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[1] });
		pointer({ type: 'pointerleave', target: node });

		const highlight = highlightOf(node);

		expect(highlight).not.toHaveClass('visible');

		vi.advanceTimersByTime(100);

		expect(highlight?.style.getPropertyValue('--highlight-y')).toBe('0px');
		expect(highlight?.style.getPropertyValue('--highlight-height')).toBe('0px');
	});

	it('hides and parks when a search re-renders the list under a still pointer', () => {
		vi.useFakeTimers();
		const { node, rows, input } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[1] });
		input.dispatchEvent(new Event('input', { bubbles: true }));

		const highlight = highlightOf(node);

		expect(highlight).not.toHaveClass('visible');

		vi.advanceTimersByTime(100);

		expect(highlight?.style.getPropertyValue('--highlight-height')).toBe('0px');
	});

	it('follows keyboard focus', () => {
		const { node, rows } = mount();
		slidingHighlight(node, true);

		(rows[1].querySelector('button') as HTMLButtonElement).focus();

		expect(highlightOf(node)).toHaveClass('visible');
		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');
	});

	it('sits in a list that scrolls on its own, as a presentational list item', () => {
		const { node, rows } = mount({ scrollingList: true });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });

		const list = node.querySelector('ul');
		const highlight = highlightOf(node);

		expect(highlight?.parentElement).toBe(list);
		expect(highlight?.tagName).toBe('LI');
		expect(highlight).toHaveAttribute('role', 'presentation');
		expect(highlight).toHaveAttribute('aria-hidden', 'true');
		expect(list).toHaveAttribute('data-sliding-highlight-list');
	});

	it('removes everything it added on destroy', () => {
		const { node, rows } = mount({ scrollingList: true });
		const action = slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });
		action.destroy();

		expect(highlightOf(node)).toBeNull();
		expect(node).not.toHaveAttribute('data-sliding-highlight');
		expect(node.querySelector('ul')).not.toHaveAttribute('data-sliding-highlight-list');

		pointer({ type: 'pointerover', target: rows[0] });

		expect(highlightOf(node)).toBeNull();
	});

	it('stays off until enabled', () => {
		const { node, rows } = mount();
		const action = slidingHighlight(node, false);

		pointer({ type: 'pointerover', target: rows[0] });

		expect(highlightOf(node)).toBeNull();

		action.update(true);
		pointer({ type: 'pointerover', target: rows[0] });

		expect(highlightOf(node)).toHaveClass('visible');
	});

	it('rests on the keyboard-focused row when the pointer leaves', () => {
		const { node, rows } = mount();
		slidingHighlight(node, true);

		(rows[0].querySelector('button') as HTMLButtonElement).focus();
		pointer({ type: 'pointerover', target: rows[1] });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');

		pointer({ type: 'pointerleave', target: node });

		expect(highlightOf(node)).toHaveClass('visible');
		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('0px');
	});

	it('moves to a row clicked without moving the pointer', () => {
		const { node, rows } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });
		(rows[1].querySelector('button') as HTMLButtonElement).focus();

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');

		pointer({ type: 'pointerdown', target: rows[0].querySelector('button') as Element });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('0px');
	});

	it('follows its row when the row changes size, and stops watching once hidden', () => {
		let notify: ResizeObserverCallback = () => undefined;
		const disconnect = vi.fn();
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: ResizeObserverCallback) {
					notify = callback;
				}
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = disconnect;
			}
		);
		const { node, rows } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-width')).toBe('200px');

		rows[0].getBoundingClientRect = () => new DOMRect(0, 0, 160, 36);
		notify([], {} as ResizeObserver);

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-width')).toBe('160px');

		disconnect.mockClear();
		pointer({ type: 'pointerleave', target: node });

		expect(disconnect).toHaveBeenCalled();
	});

	it('hides when keyboard focus leaves the rows while the pointer is elsewhere', () => {
		const { node, rows, input } = mount();
		slidingHighlight(node, true);

		const first = rows[0].querySelector('button') as HTMLButtonElement;
		first.focus();

		expect(highlightOf(node)).toHaveClass('visible');

		input.focus();

		expect(highlightOf(node)).not.toHaveClass('visible');
	});

	it("measures in the popover's own pixels while it scales in", () => {
		const { node, rows } = mount();
		// Mid-animation at 0.5: the box is half its layout width and rows sit at half their offset.
		node.style.width = '400px';
		node.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
		place({ row: rows[1], top: 18, height: 18 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[1] });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');
		expect(highlightOf(node)?.style.getPropertyValue('--highlight-height')).toBe('36px');
	});

	it('ignores list items outside the popover, such as one it is rendered in', () => {
		const outer = document.createElement('li');
		const node = document.createElement('div');
		node.innerHTML = '<button class="menu-row">Row</button><p>Text</p>';
		outer.append(node);
		document.body.append(outer);
		const row = node.querySelector('button') as HTMLButtonElement;
		place({ row, top: 0, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: row });

		expect(highlightOf(node)?.parentElement).toBe(node);

		pointer({ type: 'pointerover', target: node.querySelector('p') as Element });

		expect(highlightOf(node)).not.toHaveClass('visible');
	});

	it('moves into a list that scrolls on its own and back to the popover', () => {
		const node = document.createElement('div');
		node.innerHTML = `
			<button class="menu-row">Above the list</button>
			<ul style="overflow-y: auto"><li><button>In the list</button></li></ul>
		`;
		document.body.append(node);
		const [outside, inside] = [
			node.querySelector('.menu-row'),
			node.querySelector('li')
		] as HTMLElement[];
		place({ row: outside, top: 0, height: 36 });
		place({ row: inside, top: 36, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: inside });

		expect(highlightOf(node)?.parentElement).toBe(node.querySelector('ul'));

		pointer({ type: 'pointerover', target: outside });

		expect(highlightOf(node)?.parentElement).toBe(node);
		expect(node.querySelectorAll('.sliding-highlight')).toHaveLength(1);
	});

	it('turns off with update(false)', () => {
		const { node, rows } = mount();
		const action = slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });
		action.update(false);

		expect(highlightOf(node)).toBeNull();
		expect(node).not.toHaveAttribute('data-sliding-highlight');
	});

	it('stays on a switch or checkbox row when it is toggled', () => {
		const node = document.createElement('div');
		node.innerHTML = '<ul><li><label>Hide <input type="checkbox" /></label></li></ul>';
		document.body.append(node);
		const row = node.querySelector('li') as HTMLElement;
		place({ row, top: 0, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: row });
		(node.querySelector('input') as HTMLInputElement).dispatchEvent(
			new Event('input', { bubbles: true })
		);

		expect(highlightOf(node)).toHaveClass('visible');
	});

	it('goes back to the row under the pointer when keyboard focus leaves the rows', () => {
		const { node, rows, input } = mount();
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: rows[0] });
		(rows[1].querySelector('button') as HTMLButtonElement).focus();

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');

		input.focus();

		expect(highlightOf(node)).toHaveClass('visible');
		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('0px');
	});

	it('stays put on a wrapper between rows, so it slides on instead of blinking', () => {
		const node = document.createElement('div');
		node.innerHTML = `
			<div class="group"><ul><li><button>First</button></li></ul></div>
			<ul><li><button>Second</button></li></ul>
		`;
		document.body.append(node);
		const [first, second] = Array.from(node.querySelectorAll('li'));
		place({ row: first, top: 0, height: 36 });
		place({ row: second, top: 37, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: first });
		pointer({ type: 'pointerover', target: node.querySelector('.group') as Element });

		expect(highlightOf(node)).toHaveClass('visible');
	});

	it('stays put on a divider between groups', () => {
		const node = document.createElement('div');
		node.innerHTML = `
			<button class="nav-item">Contacts</button>
			<hr />
			<button class="nav-item">WalletConnect</button>
		`;
		document.body.append(node);
		const [first, second] = Array.from(node.querySelectorAll<HTMLElement>('.nav-item'));
		place({ row: first, top: 0, height: 36 });
		place({ row: second, top: 37, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: first });
		pointer({ type: 'pointerover', target: node.querySelector('hr') as Element });

		expect(highlightOf(node)).toHaveClass('visible');
	});

	it('leaves the rows of a dialog opened inside it to that dialog', () => {
		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		dialog.innerHTML = `
			<div class="host">
				<button class="nav-item">Support</button>
				<div class="modal" role="dialog"><ul><li><button>English</button></li></ul></div>
			</div>
		`;
		document.body.append(dialog);
		const node = dialog.querySelector('.host') as HTMLElement;
		const ownRow = node.querySelector('.nav-item') as HTMLElement;
		const nestedRow = node.querySelector('li') as HTMLElement;
		place({ row: ownRow, top: 0, height: 36 });
		place({ row: nestedRow, top: 36, height: 48 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: nestedRow });

		expect(highlightOf(node)).toBeNull();

		pointer({ type: 'pointerover', target: ownRow });

		expect(highlightOf(node)).toHaveClass('visible');

		pointer({ type: 'pointerover', target: node.querySelector('ul') as Element });

		expect(highlightOf(node)).not.toHaveClass('visible');
	});

	it('takes LogoButton rows outside a list, and skips a row whose button is disabled', () => {
		const node = document.createElement('div');
		node.innerHTML = `
			<div><button><span class="logo-button-wrapper">All networks</span></button></div>
			<ul><li><button disabled>Unavailable</button></li></ul>
		`;
		document.body.append(node);
		const logoRow = node.querySelector('button') as HTMLElement;
		const disabledRow = node.querySelector('li') as HTMLElement;
		place({ row: logoRow, top: 0, height: 36 });
		place({ row: disabledRow, top: 36, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: logoRow.querySelector('span') as Element });

		expect(highlightOf(node)).toHaveClass('visible');

		pointer({ type: 'pointerover', target: disabledRow });

		expect(highlightOf(node)).not.toHaveClass('visible');
	});

	it('takes nav-item rows, buttons and links alike, but not disabled ones', () => {
		const node = document.createElement('div');
		node.innerHTML = `
			<button class="nav-item">Help</button>
			<a class="nav-item" href="https://oisy.com">Docs</a>
			<button class="nav-item" disabled>Soon</button>
		`;
		document.body.append(node);
		const [button, link, disabled] = Array.from(node.querySelectorAll<HTMLElement>('.nav-item'));
		place({ row: button, top: 0, height: 36 });
		place({ row: link, top: 36, height: 36 });
		place({ row: disabled, top: 72, height: 36 });
		slidingHighlight(node, true);

		pointer({ type: 'pointerover', target: link });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('36px');

		pointer({ type: 'pointerover', target: button });

		expect(highlightOf(node)?.style.getPropertyValue('--highlight-y')).toBe('0px');

		pointer({ type: 'pointerover', target: disabled });

		expect(highlightOf(node)).not.toHaveClass('visible');
	});
});
