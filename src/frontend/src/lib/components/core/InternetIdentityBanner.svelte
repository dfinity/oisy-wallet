<script lang="ts">
	import { Html, themeStore } from '@dfinity/gix-components';
	import { PRIMARY_INTERNET_IDENTITY_VERSION } from '$env/auth.env';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const iiBannerVisible = $derived(PRIMARY_INTERNET_IDENTITY_VERSION === '2.0');

	const linkParams = {
		ariaLabel: $i18n.core.info.internet_identity_banner_button,
		href: OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL,
		iconVisible: false,
		styleClass: 'text-primary-inverted-alt font-bold hover:text-primary-inverted-alt/60 transition'
	};
</script>

{#if iiBannerVisible}
	<div class="mt-4 flex w-full items-center justify-center px-4 md:px-8">
		<div
			class="relative flex w-full items-center justify-center gap-1 overflow-hidden rounded-lg bg-primary-inverted p-2 text-xs text-primary-inverted-alt 1.5xs:text-sm sm:text-base"
		>
			<div class="absolute top-0 left-0 h-full lg:-left-40 xl:-left-20 1.5xl:-left-10">
				{#await import(`$lib/assets/ii-2-banner-${$themeStore ?? 'light'}-pattern-small.svg`) then { default: src }}
					<Img {src} styleClass="block lg:hidden" />
				{/await}

				{#await import(`$lib/assets/ii-2-banner-${$themeStore ?? 'light'}-pattern-big.svg`) then { default: src }}
					<Img {src} styleClass="hidden lg:block" />
				{/await}
			</div>

			<div class="absolute top-0 right-0 rotate-180">
				{#await import(`$lib/assets/ii-2-banner-${$themeStore ?? 'light'}-pattern-small.svg`) then { default: src }}
					<Img {src} />
				{/await}
			</div>

			{replaceOisyPlaceholders($i18n.core.info.internet_identity_banner_first_part)}

			<span class="hidden sm:block">
				<Html
					text={replaceOisyPlaceholders($i18n.core.info.internet_identity_banner_second_part)}
				/>
			</span>

			<span class="flex sm:hidden">
				<ExternalLink {...linkParams}>
					<Html
						text={replaceOisyPlaceholders($i18n.core.info.internet_identity_banner_second_part)}
					/>
					<IconArrowRight />
				</ExternalLink>
			</span>

			<span class="absolute top-0 right-4 bottom-0 m-auto hidden sm:flex">
				<ExternalLink {...linkParams}>
					{$i18n.core.info.internet_identity_banner_button}
					<IconArrowRight />
				</ExternalLink>
			</span>
		</div>
	</div>
{/if}
