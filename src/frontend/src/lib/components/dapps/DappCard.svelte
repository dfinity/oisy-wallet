<script lang="ts">
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { DappDescription } from '$lib/types/dappDescription';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: DappDescription;
	$: ({name, logo, oneLiner, tags} = dAppDescription);
</script>

<button
	aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, { $dAppname: name })}
	on:click
	class="relative rounded-3xl bg-white p-4 pt-12 h-44 md:h-60"
>
	<span class="absolute -top-5 left-4">
		<Img
			height="64"
			width="64"
			rounded
			src={logo}
			alt={replacePlaceholders($i18n.dapps.alt.website, { $dAppname: name })}
		/>
	</span>
	<article class="flex h-full flex-col justify-between gap-y-4 md:gap-y-2">
		<section>
			<p class="m-0 text-start text-lg font-semibold">{name}</p>
			<p
				title={oneLiner}
				class="m-0 mt-2 line-clamp-2 md:line-clamp-4 text-ellipsis text-start text-xs text-misty-rose"
			>
				{oneLiner}
			</p>
		</section>
		<section>
			<DappTags dAppName={name} tags={tags} />
		</section>
	</article>
</button>
