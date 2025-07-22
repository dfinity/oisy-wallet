<script lang="ts">
	interface Props {
		onclick: () => void;
		testId?: string;
	}

	let { onclick, testId }: Props = $props();
	let fileInput: HTMLInputElement;

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
