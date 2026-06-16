<script lang="ts">
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex flex-col items-center px-4 py-6 text-center">
	<h2 class="mb-3 text-2xl font-bold">{$i18n.buy.text.unavailable_title}</h2>

	<p class="mb-4 text-sm text-tertiary">
		<strong
			><span class="relative -top-px mr-1 inline-block align-middle text-success-primary"
				><IconShieldCheck size="16" /></span
			>{replaceOisyPlaceholders($i18n.core.text.oisy_protects_you)}</strong
		>
		{$i18n.buy.text.unavailable_description}
	</p>

	<p class="mb-6 text-sm text-tertiary">{$i18n.buy.text.unavailable_fallback_hint}</p>

	<Button colorStyle="primary" fullWidth onclick={modalStore.close} type="button">
		{$i18n.buy.actions.close}
	</Button>
</div>
