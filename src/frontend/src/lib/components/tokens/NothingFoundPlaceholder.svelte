<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import shocked from '$lib/assets/shocked.svg';
	import Html from '$lib/components/ui/Html.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		title?: string;
		description?: string;
	}

	let { title, description }: Props = $props();

	let descriptionText = $derived(description ?? $i18n.tokens.text.filter_nothing_found_description);
</script>

<div class="py-12">
	<div class="mb-2 flex justify-center p-2">
		<span class="z-0 -mr-4">
			<Img height="64" src={shocked} width="64"></Img>
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">
			{title ?? $i18n.tokens.text.filter_nothing_found}
		</p>
		{#if notEmptyString(descriptionText)}
			<p class="m-0 text-center text-tertiary">
				<Html text={descriptionText} />
			</p>
		{/if}
	</div>
</div>
