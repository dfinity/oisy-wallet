import { nonNullish } from '@dfinity/utils';

export const canShare = (): boolean =>
	nonNullish(navigator) && nonNullish(navigator.share) && navigator.canShare();

export const shareText = (text: string): Promise<void> =>
	navigator.share({
		text
	});

export const copyText = (text: string): Promise<void> => navigator.clipboard.writeText(text);

export const shareFile = (file: File): Promise<void> => navigator.share({ files: [file] });
