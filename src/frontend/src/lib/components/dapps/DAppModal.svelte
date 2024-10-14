<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import type { DApp } from '$lib/types/dapp';
	import Button from '$lib/components/ui/Button.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';

	export let dApp: DApp;
</script>

<Modal on:nnsClose={modalStore.close}>
	<div slot="title">
		<h5 class="text-center text-xl">{dApp.name}</h5>
		<p class="text-gray-500 m-0 text-center text-sm text-misty-rose">{dApp.categories[0]}</p>
	</div>

	<div class="flex flex-1 flex-col justify-between">
		<div>
			<div class="mt-6 w-full rounded-lg bg-light-blue p-6">
				<h4 class="mb-1.5 font-bold">{$i18n.dapps.text.about}</h4>
				<p class="m-0 text-misty-rose">{dApp.description}</p>
			</div>
			{#if dApp.channels}
				<div class="flex items-center justify-between p-6">
					<span class="text-misty-rose">{$i18n.dapps.text.official_channels}</span>
					<div class="flex gap-4">
						{#if dApp.channels?.github}
							<a
								href={dApp.channels.github}
								target="_blank"
								class="flex h-10 w-10 items-center justify-center rounded-full bg-dust"
							>
								<IconGitHub />
							</a>
						{/if}
						{#if dApp.channels?.twitter}
							<a
								href={dApp.channels.twitter}
								target="_blank"
								class="flex h-10 w-10 items-center justify-center rounded-full bg-dust"
							>
								<IconTwitter />
							</a>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="ml-auto mt-12">
			<a class="no-underline" target="_blank" href={dApp.url}>
				<Button>
					{replaceOisyPlaceholders($i18n.dapps.text.launch)}
				</Button>
			</a>
		</div>
	</div>
</Modal>
