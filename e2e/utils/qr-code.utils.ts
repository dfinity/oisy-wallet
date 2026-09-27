import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

declare global {
	interface Window {
		jsQR?: (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
	}
}

// Path to the bundled jsQR UMD build. Injected into the page so we can decode
// the QR straight from the canvas's `ImageData`, avoiding the
// canvas → PNG → decode round-trip that previously needed a Node-side PNG
// decoder (Jimp, removed in #9165).
const JSQR_BUNDLE_PATH = fileURLToPath(
	new URL('../../node_modules/jsqr/dist/jsQR.js', import.meta.url)
);

export const getQRCodeValueFromCanvas = async ({
	page,
	selector
}: {
	page: Page;
	selector: string;
}): Promise<string | undefined> => {
	await page.addScriptTag({ path: JSQR_BUNDLE_PATH });

	return await page.evaluate((sel) => {
		const canvas = document.querySelector<HTMLCanvasElement>(sel);
		if (canvas === null) {
			return undefined;
		}

		const ctx = canvas.getContext('2d');
		if (ctx === null || window.jsQR === undefined) {
			return undefined;
		}

		const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		return window.jsQR(data, width, height)?.data;
	}, selector);
};
