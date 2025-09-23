<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { FeaturedOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		dAppDescription: FeaturedOisyDappDescription;
		onclick: MouseEventHandler<HTMLButtonElement>;
	}

	const { dAppDescription, onclick }: Props = $props();
</script>

<article class="relative flex items-end overflow-hidden rounded-2xl">
	{#if dAppDescription.screenshots.length > 0}
		<div class="max-h-64 bg-brand-subtle-30 flex items-center justify-center">
			<ImgBanner
				alt={replacePlaceholders($i18n.dapps.alt.website, {
					$dAppName: resolveText({ i18n: $i18n, path: dAppDescription.name })
				})}
				src={dAppDescription.screenshots[0]}
			/>
		</div>
	{/if}
	<div class="backdrop-blur-xs absolute start-0 w-full flex-1 bg-black/30 px-4 py-4">
		<div class="flex items-center gap-x-2">
			<div class="h-12 w-12 rounded-full overflow-hidden">
				<Img
					alt={replacePlaceholders($i18n.dapps.alt.logo, {
						$dAppName: resolveText({ i18n: $i18n, path: dAppDescription.name })
					})}
					src={dAppDescription.logo}
					rounded={true}
				/>
			</div>
			<div class="flex-1">
				<h6 class="text-sm font-bold text-brand-primary-alt">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-primary-inverted"
					>{resolveText({ i18n: $i18n, path: dAppDescription.name })}</h4
				>
			</div>

			<Button colorStyle="primary" {onclick} paddingSmall styleClass="grow-0 text-sm">
				{$i18n.core.text.view}
			</Button>
		</div>
	</div>
</article>
