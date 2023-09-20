export const canvasToBlob = async ({
	canvas,
	type
}: {
	canvas: HTMLCanvasElement;
	type: string;
}): Promise<Blob | null> => {
	return new Promise<Blob | null>((resolve) =>
		canvas.toBlob((blob: Blob | null) => resolve(blob), type)
	);
};
