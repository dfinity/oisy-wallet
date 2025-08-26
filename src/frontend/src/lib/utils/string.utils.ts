import type { Languages } from '$lib/enums/languages';
import { isNullish } from '@dfinity/utils';

export const capitalizeFirstLetter = ({ val, language }: { val: string; language: Languages }) => {
	if (val.length === 0) {
		return val;
	}

	const segmenter = new Intl.Segmenter(language, { granularity: 'grapheme' });
	const first = segmenter.segment(val)[Symbol.iterator]().next().value;

	if (isNullish(first)) {
		return val;
	}

	return first.segment.toLocaleUpperCase(language) + val.slice(first.segment.length);
};
