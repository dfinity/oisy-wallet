<script lang="ts">
	import shocked from '$lib/assets/shocked.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12">
	<div class="mb-2 flex justify-center p-2">
		<span class="z-0 -mr-4">
			<Img height="64" src={shocked} width="64"></Img>
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.tokens.text.filter_nothing_found}</p>
		<p class="m-0 text-center text-tertiary">{$i18n.tokens.text.filter_nothing_found_description}</p
		>
	</div>
</div>
