<script lang="ts">
	import { themeStore } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import BgImg from '$lib/components/ui/BgImg.svelte';

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
</script>

<div
	class="container flex grid max-w-screen-2.5xl flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:m-auto"
>
	<div class="flex h-full flex-col justify-center px-5 md:px-8">
		<HeroSignIn />
	</div>

	<!-- TODO: determine if this value is specific/permanent or can be changed -->
	<div class="mb-5 max-h-full overflow-hidden">
		{#await import(`$lib/assets/main-image-${$themeStore ?? 'light'}.webp`) then { default: src }}
			<BgImg
				{ariaLabel}
				imageUrl={src}
				size="contain"
				shadow="none"
				styleClass="min-h-[640px] min-w-[2000px] md:min-h-full bg-left relative md:absolute"
			/>
		{/await}
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
