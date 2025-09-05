<!-- source: DFINITY foundation -->
<script lang="ts">
	export type DotVariant = 'lg' | 'md' | 'sm' | 'xs';

	interface Props {
		variant?: DotVariant;
		times?: number;
		styleClass?: string;
	}

	let { variant = 'md', times = 5, styleClass = '' }: Props = $props();

	const size = $derived(
		variant === 'lg' ? '14' : variant === 'md' ? '8' : variant === 'sm' ? '6' : '5'
	);
	const gap = $derived(variant === 'lg' ? 'gap-2' : 'gap-1');
</script>

<div class="flex {gap} {styleClass}">
	{#each Array(times) as _, i (i)}
		<svg
			fill="none"
			height={size}
			viewBox="0 0 14 14"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				clip-rule="evenodd"
				d="M9.39024 13.7666C8.30726 14 8.20635 13.9638 7.5122 13.9899C7.34425 13.9963 7.17471 13.9996 7.00382 14C6.84961 13.9996 6.69652 13.9969 6.54472 13.9917C5.5 13.9389 5.5 13.9389 4.66667 13.7779C1.94673 13.2101 -0.0119686 11.4611 5.50531e-05 7.48653L5.50531e-05 6.51348C-0.0119686 2.53104 1.94673 0.786605 4.66667 0.221076C5.5 0.0612176 5.5 0.0612175 6.54472 0.00821954C6.69652 0.00309032 6.84961 0.000395598 7.00382 0C7.17477 0 7.3443 0.00288246 7.5122 0.00882773C8.15369 0.0314817 8.58839 0.0569706 9.39024 0.229165C12.0776 0.806211 13.9999 2.56419 13.9999 6.51348V7.48653C14.0119 11.4351 12.0788 13.1871 9.39024 13.7666Z"
				fill="currentColor"
				fill-rule="evenodd"
			/>
		</svg>
	{/each}
</div>
