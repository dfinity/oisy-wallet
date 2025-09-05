import type {
	CarouselSlideOisyDappDescription,
	OisyDappDescription
} from '$lib/types/dapp-description';
import { nonNullish } from '@dfinity/utils';

export const filterCarouselDapps = ({
	dAppDescriptions,
	hiddenDappsIds
}: {
	dAppDescriptions: OisyDappDescription[];
	hiddenDappsIds: OisyDappDescription['id'][];
}): CarouselSlideOisyDappDescription[] =>
	dAppDescriptions.filter(
		({ id, carousel }) => nonNullish(carousel) && !hiddenDappsIds.includes(id)
	) as CarouselSlideOisyDappDescription[];
