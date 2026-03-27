export interface MarkdownBlockType {
	type: 'header' | 'default';
	text: string;
	id?: string;
}
