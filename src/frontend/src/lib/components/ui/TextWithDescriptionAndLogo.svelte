<script lang="ts">
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let name: string;
	export let description: string | undefined;
	export let icon: string | undefined;
</script>

<span class="flex gap-2" class:items-center={!description}>
	<Logo src={icon} alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })} />
	<span class="flex flex-col gap-0.5">
		<span class="leading-5">{name}</span>
		{#if description}
			<span class="leading-none text-xs text-misty-rose text-left">{description}</span>
		{/if}
	</span>
</span>
