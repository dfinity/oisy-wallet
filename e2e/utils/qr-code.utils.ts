// TODO: uncomment and replace Jimp with native functions, unless the library bumps its dependency to zod to v4
export const getQRCodeValueFromDataURL = async ({
	dataUrl: _
}: {
	dataUrl: string;
	// eslint-disable-next-line arrow-body-style,require-await
}): Promise<string | undefined> => {
	return Promise.reject(new Error('Function `getQRCodeValueFromDataURL` not implemented'));

	// const qrBuffer = Buffer.from(dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
	// const image = await Jimp.read(qrBuffer);
	//
	// const imageData = {
	// 	data: new Uint8ClampedArray(image.bitmap.data),
	// 	width: image.bitmap.width,
	// 	height: image.bitmap.height
	// };
	//
	// const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
	//
	// if (nonNullish(decodedQR)) {
	// 	return decodedQR.data;
	// }
};
