<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		inline?: boolean;
		size?: 'tiny' | 'small' | 'medium';
	}

	const { inline = false, size = 'medium' }: Props = $props();

	const sizes = {
		// Match the standard text line height with valid, root-font-relative lengths.
		tiny: '0.75rem',
		small: '1.5rem',
		medium: '30px'
	};
</script>

<span class:overlay={!inline}>
	<Spinner inline size={sizes[size]} />
</span>

<style lang="scss">
	.overlay {
		display: flex;
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
	}
</style>
