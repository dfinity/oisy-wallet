<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';

	interface Props {
		dAppDescription: OisyDappDescription;
	}

	let { dAppDescription }: Props = $props();
	let { name: dAppName, logo, oneLiner, tags } = $derived(dAppDescription);
</script>

<button
	class="relative flex-1 rounded-lg bg-primary p-4 pt-12 shadow-sm"
	aria-label={replacePlaceholders($i18n.dapps.alt.learn_more, {
		$dAppName: resolveText({ i18n: $i18n, path: dAppName })
	})}
	onclick={bubble('click')}
>
	<span class="absolute -top-5 left-4">
		<Logo
			alt={replacePlaceholders($i18n.dapps.alt.logo, {
				$dAppName: resolveText({ i18n: $i18n, path: resolveText({ i18n: $i18n, path: dAppName }) })
			})}
			color="white"
			ring
			size="xl"
			src={logo}
		/>
	</span>
	<article class="flex h-full flex-col justify-between gap-y-4 md:gap-y-2">
		<section>
			<p class="m-0 text-start text-lg font-semibold"
				>{resolveText({ i18n: $i18n, path: dAppName })}</p
			>
			<p
				class="m-0 mt-2 text-start text-xs text-tertiary"
				title={resolveText({ i18n: $i18n, path: oneLiner })}
			>
				{resolveText({ i18n: $i18n, path: oneLiner })}
			</p>
		</section>
		<section class="relative mt-3">
			<DappTags {dAppName} {tags} />
		</section>
	</article>
</button>
