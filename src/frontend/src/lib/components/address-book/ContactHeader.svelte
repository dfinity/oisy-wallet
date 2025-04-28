<script lang="ts">
	import Avatar from '$lib/components/address-book/Avatar.svelte';
	import IconContactHeader from '$lib/components/icons/IconContactHeader.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { CONTACT_HEADER_EDIT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	let { name, edit = undefined, styleClass = '' } = $props();
</script>

<div class={`relative flex flex-col items-center pb-5 ${styleClass}`}>
	{#if edit}
		<Button
			styleClass="absolute top-2.5 right-2.5 bg-black/16 dark:bg-black/10 px-3 py-2 font-xs"
			ariaLabel={$i18n.core.text.edit}
			colorStyle="secondary"
			testId={CONTACT_HEADER_EDIT_BUTTON}
			on:click={edit}
		>
			<span class="flex items-center">
				<IconPencil />
			</span>
			{$i18n.core.text.edit}
		</Button>
	{/if}
	<div class="self-stretch text-[lightgray]">
		<IconContactHeader></IconContactHeader>
	</div>
	<div>
		<Avatar variant="xl" {name} styleClass="mt-[-50%] border-3 border-primary-inverted"></Avatar>
	</div>
	<div class="pt-5 text-2xl font-bold text-primary md:text-3xl">
		{name}
	</div>
</div>
