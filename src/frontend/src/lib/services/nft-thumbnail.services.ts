import {
	NFT_THUMBNAIL_DECODE_TIMEOUT_MILLIS,
	NFT_THUMBNAIL_MAX_SIZE
} from '$lib/constants/app.constants';
import { isSvgMedia } from '$lib/services/url.services';
import { withTimeout } from '$lib/utils/timeout.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const thumbnails = new Map<string, Promise<string | undefined>>();

// Drawing an SVG decodes every image embedded in it at full size, so only one SVG is drawn at a time.
let drawQueue: Promise<unknown> = Promise.resolve();

const drawThumbnail = async (url: string): Promise<string> => {
	const image = new Image();
	// Without CORS, the canvas would be tainted and could not be exported.
	image.crossOrigin = 'anonymous';
	image.src = url;

	try {
		await withTimeout({
			promise: image.decode(),
			milliseconds: NFT_THUMBNAIL_DECODE_TIMEOUT_MILLIS
		});

		const { naturalWidth, naturalHeight } = image;

		// An SVG without width and height attributes has a default natural size (e.g. 150x150), but it is still
		// rasterised sharply at the size it is drawn at.
		const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1;

		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(NFT_THUMBNAIL_MAX_SIZE * Math.min(1, ratio)));
		canvas.height = Math.max(1, Math.round(NFT_THUMBNAIL_MAX_SIZE * Math.min(1, 1 / ratio)));

		const context = canvas.getContext('2d');

		if (isNullish(context)) {
			throw new Error('Canvas 2D context not available');
		}

		context.drawImage(image, 0, 0, canvas.width, canvas.height);

		// A data URL, because the Content Security Policy allows `data:` images but not `blob:` ones.
		const thumbnail = canvas.toDataURL('image/png');

		// Free the canvas memory now instead of when it is garbage collected.
		canvas.width = 0;
		canvas.height = 0;

		return thumbnail;
	} finally {
		image.src = '';
	}
};

const enqueueDrawThumbnail = (url: string): Promise<string> => {
	const thumbnail = drawQueue.then(() => drawThumbnail(url));

	drawQueue = thumbnail.catch(() => undefined);

	return thumbnail;
};

const createThumbnail = async (url: string): Promise<string | undefined> => {
	try {
		if (!(await isSvgMedia(url))) {
			return;
		}

		return await enqueueDrawThumbnail(url);
	} catch (_: unknown) {
		// The SVG could not be loaded or drawn (e.g. no CORS): the caller shows the original media instead.
	}
};

/**
 * Loads a downscaled PNG copy of an NFT media when it is an SVG.
 *
 * An SVG can embed several full-size bitmaps (e.g. layers of 1920x1920 pixels) that the browser keeps decoded while
 * the SVG is displayed: a few dozen of them on one page are enough for iOS to kill the page. Drawing each SVG once
 * into a small canvas keeps only the small copy in memory.
 *
 * The result is cached per URL. It never rejects.
 *
 * @param url - The URL of the NFT media
 * @returns A PNG data URL, or `undefined` if the media is not an SVG or could not be drawn.
 */
export const loadNftThumbnail = (url: string): Promise<string | undefined> => {
	const cached = thumbnails.get(url);

	if (nonNullish(cached)) {
		return cached;
	}

	const thumbnail = createThumbnail(url);

	thumbnails.set(url, thumbnail);

	return thumbnail;
};

export const resetNftThumbnails = (): void => {
	thumbnails.clear();
};
