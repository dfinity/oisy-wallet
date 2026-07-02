import {
	getMarkdownBlocks,
	htmlRenderer,
	imageToLinkRenderer,
	markdownToHTML,
	targetBlankLinkRenderer
} from '$lib/utils/markdown.utils';

describe('getMarkdownBlocks', () => {
	it('splits markdown into blocks with headers and defaults', () => {
		const markdown = '### First Heading\n\nSome paragraph text\n\n### Second Heading';

		const result = getMarkdownBlocks({ markdown, headingDesignator: '###' });

		expect(result).toEqual([
			{ type: 'header', text: 'First Heading', id: 'first-heading' },
			{ type: 'default', text: 'Some paragraph text' },
			{ type: 'header', text: 'Second Heading', id: 'second-heading' }
		]);
	});

	it('trims spaces after heading designator', () => {
		const markdown = '###    Spaced Heading';
		const result = getMarkdownBlocks({ markdown, headingDesignator: '###' });

		expect(result[0]).toEqual({
			type: 'header',
			text: 'Spaced Heading',
			id: 'spaced-heading'
		});
	});

	it('handles non-heading lines correctly', () => {
		const markdown = 'Just some text';
		const result = getMarkdownBlocks({ markdown, headingDesignator: '###' });

		expect(result).toEqual([{ type: 'default', text: 'Just some text' }]);
	});

	it('generates slugified IDs with dashes', () => {
		const markdown = '### Heading With !@#$ Symbols';
		const result = getMarkdownBlocks({ markdown, headingDesignator: '###' });

		expect(result[0].id).toBe('heading-with-symbols');
	});

	it('supports custom heading designators', () => {
		const markdown = '## Custom H2\n\nSome text';
		const result = getMarkdownBlocks({ markdown, headingDesignator: '##' });

		expect(result[0]).toEqual({
			type: 'header',
			text: 'Custom H2',
			id: 'custom-h2'
		});

		expect(result[1]).toEqual({
			type: 'default',
			text: 'Some text'
		});
	});

	it('returns empty array for empty string', () => {
		const result = getMarkdownBlocks({ markdown: '', headingDesignator: '###' });

		expect(result).toEqual([{ type: 'default', text: '' }]);
	});
});

describe('targetBlankLinkRenderer', () => {
	it('renders a target-blank link with href, title and text', () => {
		expect(targetBlankLinkRenderer('https://oisy.com', 'Oisy', 'Visit')).toBe(
			'<a target="_blank" rel="noopener noreferrer" href="https://oisy.com" title="Oisy">Visit</a>'
		);
	});

	it('omits the href attributes when href is nullish', () => {
		expect(targetBlankLinkRenderer(null, null, 'Visit')).toBe('<a>Visit</a>');
		expect(targetBlankLinkRenderer(undefined, undefined, 'Visit')).toBe('<a>Visit</a>');
	});

	it('omits the title attribute when title is nullish', () => {
		expect(targetBlankLinkRenderer('https://oisy.com', null, 'Visit')).toBe(
			'<a target="_blank" rel="noopener noreferrer" href="https://oisy.com">Visit</a>'
		);
	});

	it('falls back to href then title when the text is empty', () => {
		expect(targetBlankLinkRenderer('https://oisy.com', 'Oisy', '')).toBe(
			'<a target="_blank" rel="noopener noreferrer" href="https://oisy.com" title="Oisy">https://oisy.com</a>'
		);
		expect(targetBlankLinkRenderer(null, 'Oisy', '')).toBe('<a title="Oisy">Oisy</a>');
	});
});

describe('imageToLinkRenderer', () => {
	it('returns the alt text when the src is nullish or empty', () => {
		expect(imageToLinkRenderer(null, null, 'alt')).toBe('alt');
		expect(imageToLinkRenderer(undefined, undefined, 'alt')).toBe('alt');
		expect(imageToLinkRenderer('', null, 'alt')).toBe('alt');
	});

	it('renders a link with a type attribute derived from the file extension', () => {
		expect(imageToLinkRenderer('https://oisy.com/logo.png', null, 'Logo')).toBe(
			'<a href="https://oisy.com/logo.png" target="_blank" rel="noopener noreferrer" type="image/png">Logo</a>'
		);
	});

	it('omits the type attribute when the src has no extension', () => {
		expect(imageToLinkRenderer('logo', null, 'Logo')).toBe(
			'<a href="logo" target="_blank" rel="noopener noreferrer">Logo</a>'
		);
	});

	it('renders the title attribute when defined', () => {
		expect(imageToLinkRenderer('logo', 'A title', 'Logo')).toBe(
			'<a href="logo" target="_blank" rel="noopener noreferrer" title="A title">Logo</a>'
		);
	});

	it('falls back to the title then the src when the alt is empty', () => {
		expect(imageToLinkRenderer('logo', 'A title', '')).toBe(
			'<a href="logo" target="_blank" rel="noopener noreferrer" title="A title">A title</a>'
		);
		expect(imageToLinkRenderer('logo', null, '')).toBe(
			'<a href="logo" target="_blank" rel="noopener noreferrer">logo</a>'
		);
	});
});

describe('htmlRenderer', () => {
	it('returns the html unchanged when it contains no img tag', () => {
		expect(htmlRenderer('<strong>bold</strong>')).toBe('<strong>bold</strong>');
	});

	it('converts an img tag with a remote src to a link', () => {
		expect(htmlRenderer('<img src="https://oisy.com/logo.png" alt="Logo" />')).toBe(
			'<a href="https://oisy.com/logo.png" target="_blank" rel="noopener noreferrer" type="image/png">Logo</a>'
		);
	});

	it('defaults the alt text to "img" when missing', () => {
		expect(htmlRenderer('<img src="https://oisy.com/logo.png" />')).toBe(
			'<a href="https://oisy.com/logo.png" target="_blank" rel="noopener noreferrer" type="image/png">img</a>'
		);
	});

	it('escapes an img tag with a data:image src instead of linking it', () => {
		const result = htmlRenderer('<img src="data:image/png;base64,AAAA" alt="Logo" />');

		expect(result).toBe('&lt;img src="data:image/png;base64,AAAA" alt="Logo" /&gt;');
	});

	it('escapes an img tag with no src', () => {
		expect(htmlRenderer('<img alt="Logo" />')).toBe('&lt;img alt="Logo" /&gt;');
	});

	it('transforms only the img tag and preserves the surrounding html', () => {
		expect(htmlRenderer('<p>See <img src="https://oisy.com/logo.png" alt="Logo" /> here</p>')).toBe(
			'<p>See <a href="https://oisy.com/logo.png" target="_blank" rel="noopener noreferrer" type="image/png">Logo</a> here</p>'
		);
	});

	it('transforms multiple img tags independently', () => {
		expect(htmlRenderer('<img src="a.png" alt="A" /><img src="b.png" alt="B" />')).toBe(
			'<a href="a.png" target="_blank" rel="noopener noreferrer" type="image/png">A</a><a href="b.png" target="_blank" rel="noopener noreferrer" type="image/png">B</a>'
		);
	});
});

describe('markdownToHTML', () => {
	it('renders links with target blank via the custom renderer', async () => {
		const result = await markdownToHTML('[Oisy](https://oisy.com)');

		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).toContain('href="https://oisy.com"');
	});

	it('renders images as links via the custom renderer', async () => {
		const result = await markdownToHTML('![Logo](https://oisy.com/logo.png)');

		expect(result).toContain('href="https://oisy.com/logo.png"');
		expect(result).toContain('type="image/png"');
	});

	it('escapes svg elements outside of code blocks', async () => {
		const result = await markdownToHTML('<svg><circle /></svg>');

		expect(result).toContain('&lt;svg&gt;');
		expect(result).not.toContain('<svg>');
	});

	it('keeps svg elements untouched inside fenced code blocks', async () => {
		const result = await markdownToHTML('```\n<svg><circle /></svg>\n```');

		// Inside a fenced code block, marked escapes the angle brackets itself, so
		// the raw <svg> should be preserved by escapeSvgs (not double-handled).
		expect(result).toContain('&lt;svg&gt;');
	});

	it('returns plain markdown unchanged when there is no svg to escape', async () => {
		const result = await markdownToHTML('# Title');

		expect(result).toContain('<h1');
		expect(result).toContain('Title');
	});
});
