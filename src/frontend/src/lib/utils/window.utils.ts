import { browser } from '$app/environment';
import { isNullish } from '@dfinity/utils';

// When OISY is embedded by another origin (the extension's side panel), reading the top window's
// size throws. The browser window's outer size is readable from any frame and centres the popup on
// the same window.
const topWindowSize = (): { innerWidth: number; innerHeight: number } => {
	try {
		const { innerWidth, innerHeight } = window.top ?? window;
		return { innerWidth, innerHeight };
	} catch (_: unknown) {
		return { innerWidth: window.outerWidth, innerHeight: window.outerHeight };
	}
};

export const popupCenter = ({
	width,
	height
}: {
	width: number;
	height: number;
}): string | undefined => {
	if (!browser) {
		return undefined;
	}

	if (isNullish(window) || isNullish(window.top)) {
		return undefined;
	}

	const { innerWidth, innerHeight } = topWindowSize();

	const y = innerHeight / 2 + screenY - height / 2;
	const x = innerWidth / 2 + screenX - width / 2;

	return `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${y}, left=${x}`;
};
