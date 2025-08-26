import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
import * as i18nUtils from '$lib/utils/i18n.utils';
import * as mdUtils from '$lib/utils/markdown.utils';
import { render, waitFor } from '@testing-library/svelte';

// We need to stub the intersection observer so the sidebar can be mounted
class IOStub {
	constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
	observe() {}
	unobserve() {}
	disconnect() {}
}
let originalIO: typeof IntersectionObserver | undefined;

describe('MarkdownWithSidebar', () => {
	beforeAll(() => {
		originalIO = globalThis.IntersectionObserver;
		globalThis.IntersectionObserver = IOStub as unknown as typeof IntersectionObserver;
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(() => {
		globalThis.IntersectionObserver = originalIO as typeof IntersectionObserver;
	});

	it('renders the title <h1> from the title prop', () => {
		const title = 'Terms of Use';

		vi.spyOn(mdUtils, 'getMarkdownBlocks').mockReturnValue([
			{ type: 'header', text: 'Section A', id: 'section-a' },
			{ type: 'default', text: 'Some body $var' }
		]);

		const rp = vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementation((s) => s);

		const { getByRole } = render(MarkdownWithSidebar, {
			props: {
				title,
				text: '### Section A\nSome body $var',
				stringReplacements: { $var: 'VALUE' }
			}
		});

		const h1 = getByRole('heading', { level: 1, name: title });

		expect(h1).toBeInTheDocument();

		expect(rp).toHaveBeenCalledWith('Some body $var', { $var: 'VALUE' });
	});

	it('passes { markdown: text, headingDesignator } to getMarkdownBlocks (default ###)', () => {
		const spy = vi.spyOn(mdUtils, 'getMarkdownBlocks').mockReturnValue([]);

		render(MarkdownWithSidebar, {
			props: {
				title: 't',
				text: '### H\nP',
				stringReplacements: {}
				// headingDesignator omitted -> defaults to "###"
			}
		});

		expect(spy).toHaveBeenCalledWith({
			markdown: '### H\nP',
			headingDesignator: '###'
		});
	});

	it('passes custom headingDesignator to getMarkdownBlocks and renders header ids/text', async () => {
		const spy = vi.spyOn(mdUtils, 'getMarkdownBlocks').mockReturnValue([
			{ type: 'header', text: 'Custom H2', id: 'custom-h2' },
			{ type: 'default', text: 'Body line' }
		]);

		vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementation((s) => `RP:${s}`);

		const { getByRole, getByText } = render(MarkdownWithSidebar, {
			props: {
				title: 'Doc',
				text: '## Custom H2\nBody line',
				stringReplacements: {},
				headingDesignator: '##'
			}
		});

		expect(spy).toHaveBeenCalledWith({
			markdown: '## Custom H2\nBody line',
			headingDesignator: '##'
		});

		const h3 = getByRole('heading', { level: 3, name: 'Custom H2' });

		expect(h3).toBeInTheDocument();

		expect(h3.getAttribute('id')).toBe('custom-h2');

		await waitFor(() => {
			const replaced = getByText(/^RP:Body line$/);

			expect(replaced).toBeInTheDocument();
		});
	});
});
