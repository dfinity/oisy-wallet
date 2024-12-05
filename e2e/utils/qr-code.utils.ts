import { nonNullish } from '@dfinity/utils';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';

export const getQRCodeValueFromDataURL = async ({
	dataUrl
}: {
	dataUrl: string;
}): Promise<string | undefined> => {
	const qrBuffer = Buffer.from(dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
	const image = await Jimp.read(qrBuffer);

	const imageData = {
		data: new Uint8ClampedArray(image.bitmap.data),
		width: image.bitmap.width,
		height: image.bitmap.height
	};

	const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);

	if (nonNullish(decodedQR)) {
		return decodedQR.data;
	}
};
