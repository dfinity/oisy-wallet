<script lang="ts">
	import { fromNullable, isNullish } from '@dfinity/utils';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import Carousel from '$lib/components/carousel/Carousel.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {  userSettings } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import {
		type CarouselSlideOisyDappDescription,
		dAppDescriptions,
		type OisyDappDescription
	} from '$lib/types/dapp-description';
	import { filterCarouselDapps } from '$lib/utils/dapps.utils';
	import { emit } from '$lib/utils/events.utils';



	// It may happen that the user's settings are refreshed before having been updated.
	// But for that small instant of time, we could still show the dApp.
	// To avoid this glitch we store the dApp id in a temporary array, and we add it to the hidden dApps ids.
	let temporaryHiddenDappsIds: OisyDappDescription['id'][] = [];

	let hiddenDappsIds: OisyDappDescription['id'][];
	$: hiddenDappsIds = [
		...($userSettings?.dapp.dapp_carousel.hidden_dapp_ids ?? []),
		...temporaryHiddenDappsIds
	];

	let dappsCarouselSlides: CarouselSlideOisyDappDescription[];
	$: dappsCarouselSlides = filterCarouselDapps({ dAppDescriptions, hiddenDappsIds });


</script>
