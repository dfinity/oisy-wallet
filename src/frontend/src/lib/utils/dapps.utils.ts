import {
	type CarouselSlideOisyDappDescription,
	type OisyDappDescription
} from '$lib/types/dapp-description';
import { nonNullish } from '@dfinity/utils';

export const filterCarouselDapps = (
	dAppDescriptions: OisyDappDescription[]
): CarouselSlideOisyDappDescription[] =>
	dAppDescriptions.filter(({ carousel }) =>
		nonNullish(carousel)
	) as CarouselSlideOisyDappDescription[];
