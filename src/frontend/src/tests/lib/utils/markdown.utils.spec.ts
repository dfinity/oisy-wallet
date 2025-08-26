import { getMarkdownBlocks } from '$lib/utils/markdown.utils';

describe('getMarkdownBlocks', () => {
	it('splits markdown into blocks with headers and defaults', () => {
		const markdown = `### First Heading
Some paragraph text
### Second Heading`;

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
		const markdown = `## Custom H2
Some text`;
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
