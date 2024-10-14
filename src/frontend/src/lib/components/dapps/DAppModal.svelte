<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Button from '$lib/components/ui/Button.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';

	export let dApp: DApp;
</script>

<Modal on:nnsClose={modalStore.close}>
	<div class="relative z-50 overflow-visible">
		<h5 class="text-center text-xl">{dApp.name}</h5>
		<p class="text-center text-sm text-gray-500 text-misty-rose m-0">{dApp.categories[0]}</p>

	</div>

	<div>

		<div class="w-full bg-light-blue p-6 mt-6 rounded-lg">
			<h4 class="font-bold mb-1.5">{$i18n.dapps.text.about}</h4>
			<p class="text-misty-rose m-0">{dApp.description}</p>
		</div>
		{#if dApp.channels}
			<div class="p-6 flex justify-between">
				<span class="text-misty-rose">{$i18n.dapps.text.official_channels}</span>
				{#if dApp.channels?.github}
					<a href={dApp.channels.github} class="rounded-full h-10 w-10 bg-dust">
						<IconGitHub />
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<Button styleClass="ml-auto mt-12">
		{replaceOisyPlaceholders($i18n.dapps.text.launch)}
	</Button>
</Modal>
