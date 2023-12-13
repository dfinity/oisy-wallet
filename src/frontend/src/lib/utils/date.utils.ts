const options: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false
};

export const formatNanosecondsToDate = (nanoseconds: bigint): string => {
	const date = new Date(Number(nanoseconds / 1_000_000n));
	return date.toLocaleDateString('en', options);
};
