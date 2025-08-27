<script lang="ts">
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<Button colorStyle="tertiary-alt" innerStyleClass="h-5" paddingSmall styleClass="rounded-lg border-brand-subtle-30 p-2">
	<span class="flex items-center gap-1">
		<IconEyeOff size="18" />
		<span class="flex px-[2px] font-semibold">Hide</span>
	</span>
</Button>
