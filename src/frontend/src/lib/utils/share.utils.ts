import { nonNullish } from '@dfinity/utils';

export const canShare = (): boolean => nonNullish(navigator) && nonNullish(navigator.share);

export const shareText = (text: string): Promise<void> =>
	navigator.share({
		text
	});

export const copyText = (text: string): Promise<void> => navigator.clipboard.writeText(text);

export const shareFile = ({ file, text }: { file: File; text: string }): Promise<void> =>
	navigator.share({ text, files: [file] });

export const readClipboard = (): Promise<string> => navigator.clipboard.readText();
