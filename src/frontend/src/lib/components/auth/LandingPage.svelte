<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import FeatureCards from '$lib/components/auth/FeatureCards.svelte';
	import SignupsClosedBanner from '$lib/components/auth/SignupsClosedBanner.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/theme.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
</script>

<div
	class="mx-auto flex w-full max-w-screen-xl flex-1 flex-col items-center gap-8 px-5 md:gap-12 md:px-8"
>
	<div class="flex w-full max-w-screen-md flex-col items-center">
		<SignupsClosedBanner />

		<HeroSignIn />
	</div>

	<div class="flex w-full justify-center">
		{#await import(`$lib/assets/main-image-${$themeStore ?? 'light'}.webp`) then { default: src }}
			<Img alt={ariaLabel} {src} styleClass="h-full w-[90%] object-cover" />
		{/await}
	</div>

	<div class="w-full sm:-mt-48">
		<FeatureCards />
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
