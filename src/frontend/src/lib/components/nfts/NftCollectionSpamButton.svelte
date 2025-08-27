<script lang="ts">
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<Button
	colorStyle="tertiary-alt"
	paddingSmall
	styleClass="rounded-lg border-brand-subtle-30 p-1.5"
>
	<span class="flex gap-1 items-center">
		<IconAlertOctagon size="18" />
		<span class="flex px-[2px] font-semibold">Spam</span>
	</span>
</Button>