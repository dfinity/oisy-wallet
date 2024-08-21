<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { Html, Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import CoverWhat from '$lib/assets/cover-features.png';
	import Img from '$lib/components/ui/Img.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><p class="text-xl">{replaceOisyPlaceholders($i18n.about.what.text.title)}</p></svelte:fragment
	>

	<div class="stretch pt-4">
		<Img src={CoverWhat} alt={$i18n.about.what.text.title} />

		<p class="mt-6">
			<IconCrypto />
			<Html text={replaceOisyPlaceholders($i18n.about.what.text.hold_crypto)} />
		</p>

		<p class="mt-6">
			<IconWalletConnect />
			<Html text={replaceOisyPlaceholders($i18n.about.what.text.use_eth_dapps)} />
		</p>

		<p class="my-6">
			<Html text={replaceOisyPlaceholders($i18n.about.what.text.use_ic_dapps)} />
		</p>
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
