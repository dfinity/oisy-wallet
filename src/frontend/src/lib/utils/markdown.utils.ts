import type { MarkdownBlockType } from '$lib/types/markdown';

export const getMarkdownBlocks = ({
	md,
	headingDesignator
}: {
	md: string;
	headingDesignator: string;
}): MarkdownBlockType[] =>
	md.split('\n').map((line: string) => {
		if (line.startsWith(headingDesignator)) {
			const title = line.slice(headingDesignator.length).trim();
			const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			return { type: 'header', text: title, id };
		}
		return { type: 'default', text: line };
	});
