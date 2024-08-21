<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { Html, Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconIcLogoPlain from '$lib/components/icons/IconIcLogoPlain.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import IconIdCard from '$lib/components/icons/IconIdCard.svelte';
	import CoverHow from '$lib/assets/cover-how-it-works.png';
	import Img from '$lib/components/ui/Img.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><p class="text-xl">{replaceOisyPlaceholders($i18n.about.how.text.title)}</p>
	</svelte:fragment>

	<div class="stretch pt-4">
		<Img src={CoverHow} alt={$i18n.about.how.text.title} />

		<p class="mt-6">
			<IconKey />
			<Html text={replaceOisyPlaceholders($i18n.about.how.text.self_custody)} />
		</p>

		<p class="mt-6">
			<IconIcLogoPlain />
			<Html text={replaceOisyPlaceholders($i18n.about.how.text.fully_on_chain)} />
		</p>

		<p class="mt-6">
			<IconWorld />
			<Html text={replaceOisyPlaceholders($i18n.about.how.text.cross_device)} />
		</p>

		<p class="mt-6">
			<IconIdCard />
			<Html text={replaceOisyPlaceholders($i18n.about.how.text.verifiable_credentials)} />
		</p>

		<p class="my-6">
			<IconGitHub />
			<Html text={replaceOisyPlaceholders($i18n.about.how.text.open_source)} />
		</p>
	</div>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
