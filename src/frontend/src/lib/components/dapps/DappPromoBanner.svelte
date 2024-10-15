<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Button from '$lib/components/ui/Button.svelte';
	export let dApp: DApp
</script>

<div class="rounded-2xl h-64 overflow-hidden bg-cover bg-center flex items-end" style="background-image: url('{dApp.imageUrl}')">

	<div class="px-4 py-4 backdrop-blur-sm flex-1">
		<div class="flex gap-x-2 items-center">
			<img class="rounded-full h-12 w-12" src={dApp.logoUrl} alt={dApp.name}/>
			<div class="flex-1">
				<h6 class="text-sm text-info font-bold">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-white">{dApp.name}</h4>
			</div>
			<Button size="sm" colorStyle="secondary" styleClass="flex-grow-0">{$i18n.core.text.view}</Button>
		</div>
	</div>
</div>

<style lang="css">

</style>
