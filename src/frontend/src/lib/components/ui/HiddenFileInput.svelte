<script lang="ts">
	interface Props {
		onClick?: () => void;
		testId?: string;
	}

	let { onclick, testId }: Props = $props();

	let fileInput = $state<HTMLInputElement | undefined>();

	export const triggerClick = (): void => {
		fileInput?.click();
		onclick?.();
	};
</script>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	data-tid={testId}
	class="visually-hidden"
	on:change
/>
