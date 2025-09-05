<script lang="ts">
	import type { ContactImage } from '$declarations/backend/backend.did';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import IconContactHeader from '$lib/components/icons/IconContactHeader.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { CONTACT_TEXT_COLORS } from '$lib/constants/contact.constants';
	import { CONTACT_HEADER_EDIT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { selectColorForName } from '$lib/utils/contact.utils';

	interface Props {
		name: string;
		image?: ContactImage | null;
		onEdit: () => void;
		styleClass?: string;
	}

	let { name, image, onEdit, styleClass = '' }: Props = $props();

	let color = $derived(selectColorForName({ name, colors: CONTACT_TEXT_COLORS }));

	const headerStyles = `
		backdrop-filter: blur(1px);
		-webkit-backdrop-filter: blur(1px);
		overflow: hidden;
		`;
</script>

<div class={`relative flex w-full flex-col items-center ${styleClass}`}>
	<Button
		ariaLabel={$i18n.core.text.edit}
		colorStyle="secondary"
		onclick={onEdit}
		styleClass="absolute z-1 top-2.5 right-2.5 bg-black/16 dark:bg-black/10 px-3 py-2 font-xs"
		testId={CONTACT_HEADER_EDIT_BUTTON}
	>
		<span class="flex items-center">
			<IconPencil />
		</span>
		{$i18n.core.text.edit}
	</Button>

	<div style={headerStyles} class={`self-stretch ${color} transition-colors duration-1000`}>
		<IconContactHeader />
	</div>
	<div>
		<Avatar {name} {image} styleClass="mt-[-50%] border-3 border-primary-inverted" variant="xl"
		></Avatar>
	</div>
	<div class="pt-5 text-2xl font-bold text-primary md:text-3xl">
		{name}
	</div>
</div>
