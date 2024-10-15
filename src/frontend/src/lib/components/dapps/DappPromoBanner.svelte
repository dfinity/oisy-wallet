<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Button from '$lib/components/ui/Button.svelte';
	export let dApp: DApp;
</script>

<div
	class="flex h-64 items-end overflow-hidden rounded-2xl bg-cover bg-center"
	style="background-image: url('{dApp.imageUrl}')"
>
	<div class="flex-1 px-4 py-4 backdrop-blur-sm">
		<div class="flex items-center gap-x-2">
			<img class="h-12 w-12 rounded-full" src={dApp.logoUrl} alt={dApp.name} />
			<div class="flex-1">
				<h6 class="text-info text-sm font-bold">{$i18n.dapps.text.featured}</h6>
				<h4 class="text-white">{dApp.name}</h4>
			</div>
			<Button size="sm" colorStyle="secondary" styleClass="flex-grow-0"
				>{$i18n.core.text.view}</Button
			>
		</div>
	</div>
</div>

<style lang="css">
</style>
