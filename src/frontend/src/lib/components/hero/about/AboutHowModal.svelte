<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import CoverHow from '$lib/assets/cover-how-it-works.png';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconIcLogoPlain from '$lib/components/icons/IconIcLogoPlain.svelte';
	import IconIdCard from '$lib/components/icons/IconIdCard.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { ABOUT_HOW_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close} testId={ABOUT_HOW_MODAL}>
	<svelte:fragment slot="title"
		><span class="text-xl">{replaceOisyPlaceholders($i18n.about.how.text.title)}</span>
	</svelte:fragment>

	<div class="stretch pt-4">
		<ImgBanner src={CoverHow} alt={$i18n.about.how.text.title} />

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

	<button class="secondary full text-center" on:click={modalStore.close}
		>{$i18n.core.text.close}</button
	>
</Modal>
