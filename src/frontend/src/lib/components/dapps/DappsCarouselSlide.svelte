<script lang="ts">
	import { fromNullable, isNullish } from '@dfinity/utils';
	import { addUserHiddenDappId } from '$lib/api/backend.api';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import { type CarouselSlideOisyDappDescription } from '$lib/types/dapp-description';
	import { emit } from '$lib/utils/events.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dappsCarouselSlide: CarouselSlideOisyDappDescription;
	$: ({
		id: dappId,
		carousel: { text, callToAction },
		logo,
		name: dAppName
	} = dappsCarouselSlide);

	const close = async () => {
		if (isNullish($authIdentity) || isNullish($userProfileStore)) {
			return;
		}

		await addUserHiddenDappId({
			dappId,
			identity: $authIdentity,
			currentUserVersion: fromNullable($userProfileStore.profile.version)
		});

		emit({ message: 'oisyRefreshUserProfile' });
	};
</script>

<div class="flex h-full items-center justify-between">
	<div class="mr-4 shrink-0">
		<Img
			height="64"
			width="64"
			rounded
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dAppName })}
		/>
	</div>
	<div class="w-full justify-start">
		<div class="mb-1">{text}</div>
		<button
			on:click={() => {
				modalStore.openDappDetails(dappsCarouselSlide);
			}}
			aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppName: dAppName })}
			class="text-sm font-semibold text-brand-primary"
		>
			{callToAction} →
		</button>
	</div>
	<button
		class="h-full items-start p-1 text-tertiary"
		on:click={close}
		aria-label={$i18n.core.text.close}
	>
		<IconClose size="20" />
	</button>
</div>
