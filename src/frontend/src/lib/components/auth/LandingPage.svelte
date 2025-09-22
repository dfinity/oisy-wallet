<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
</script>

<div
	class="container flex grid max-w-screen-2.5xl flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:m-auto"
>
	<div class="flex h-full flex-col justify-center px-5 md:px-8">
		<HeroSignIn />
	</div>

	<div class="min-h-[85dvh] md:mt-10 md:min-h-[75dvh]">
		{#await import(`$lib/assets/main-image-${$themeStore ?? 'light'}.webp`) then { default: src }}
			<BgImg
				{ariaLabel}
				imageUrl={src}
				shadow="none"
				size="contain"
				styleClass="min-h-[85dvh] min-w-[1400px] bg-left absolute"
			/>
		{/await}
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
