<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let dApp = null;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl">{dApp ? dApp.name : ''}</span>
	</svelte:fragment>

	<div class="stretch pt-4">
		<img src={dApp?.imageUrl || '/default-dapp-icon.png'} alt={dApp?.name} class="w-16 h-16 rounded-full mx-auto mb-4" />
		<p class="text-center text-sm text-gray-500 mb-4">Decentralized Exchange</p>

		<div class="w-full bg-blue-50 p-4 rounded-lg mb-4">
			<h3 class="font-bold mb-2">{replaceOisyPlaceholders($i18n.core.text.about)}</h3>
			<Html text={dApp ? dApp.description : ''} />
		</div>

		<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg w-full">
			{replaceOisyPlaceholders($i18n.core.text.launch_dapp)}
		</button>
	</div>

	<button class="secondary full text-center mt-6" on:click={modalStore.close}>
		{$i18n.core.text.close}
	</button>
</Modal>
