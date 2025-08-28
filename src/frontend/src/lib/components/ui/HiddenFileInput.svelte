<script lang="ts">
	interface Props {
		onClick?: () => void;
		onChange?: (e: Event) => void;
		testId?: string;
	}

	let { onClick, onChange, testId }: Props = $props();

	let fileInput = $state<HTMLInputElement | undefined>();

	export const triggerClick = (): void => {
		fileInput?.click();
		onClick?.();
	};
</script>

<input
	bind:this={fileInput}
	class="visually-hidden"
	accept="image/*"
	data-tid={testId}
	onchange={(e: Event) => onChange?.(e)}
	type="file"
/>
