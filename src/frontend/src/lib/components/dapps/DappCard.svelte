<script lang="ts">
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: OisyDappDescription;
	$: ({ name: dAppName, logo, oneLiner, tags } = dAppDescription);
</script>

<button
	aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppName: dAppName })}
	on:click
	class="h-60 rounded-lg p-4 pt-12 shadow-sm relative flex-1 bg-primary"
>
	<span class="-top-5 left-4 absolute">
		<Logo
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppName: dAppName })}
			size="xl"
			ring
			color="white"
		/>
	</span>
	<article class="gap-y-4 md:gap-y-2 flex h-full flex-col justify-between">
		<section>
			<p class="m-0 text-lg font-semibold text-start">{dAppName}</p>
			<p title={oneLiner} class="m-0 mt-2 text-xs text-start text-tertiary">
				{oneLiner}
			</p>
		</section>
		<section class="right-4 bottom-4 left-4 max-h-6 min-h-6 md:max-h-14 absolute overflow-hidden">
			<DappTags {dAppName} {tags} />
		</section>
	</article>
</button>
