<script lang="ts">
	import { stopPropagation } from '@dfinity/gix-components';
	import Self from '$lib/components/ui/Json.svelte';
	import { isHash, stringifyJson, isPrincipal } from '$lib/utils/json.utils';

	interface Props {
		json?: unknown;
		defaultExpandedLevel?: number;
		_key?: string;
		_level?: number;
		_collapsed?: boolean;
	}

	let {
		json,
		defaultExpandedLevel = Infinity,
		_key = '',
		_level = 1,
		_collapsed
	}: Props = $props();

	type ValueType =
		| 'bigint'
		| 'boolean'
		| 'function'
		| 'null'
		| 'number'
		| 'object'
		| 'principal'
		| 'hash'
		| 'string'
		| 'symbol'
		| 'undefined';

	const getValueType = (value: unknown): ValueType => {
		if (value === null) {
			return 'null';
		}
		if (isPrincipal(value)) {
			return 'principal';
		}
		if (Array.isArray(json) && isHash(json)) {
			return 'hash';
		}
		return typeof value;
	};

	let valueType = $derived(getValueType(json));
	let isExpandable = $derived(valueType === 'object');
	let value = $derived(isExpandable ? json : stringifyJson({ value: json }));
	let keyLabel = $derived(`${_key}${_key.length > 0 ? ': ' : ''}`);
	let children = $derived(isExpandable ? Object.entries(json as object) : []);
	let hasChildren = $derived(children.length > 0);
	let isArray = $derived(Array.isArray(json));
	let openBracket = $derived(isArray ? '[' : '{');
	let closeBracket = $derived(isArray ? ']' : '}');
	let root = $derived(_level === 1);
	let testId = $derived(root ? 'json' : undefined);

	let title = $derived(valueType === 'hash' ? (json as number[]).join() : undefined);

	let collapsed = $derived(_collapsed ?? defaultExpandedLevel < _level);

	const toggle = () => {
		collapsed = !collapsed;
	};
</script>

{#if isExpandable && hasChildren}
	{#if collapsed}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<span
			class="key"
			class:arrow={isExpandable && hasChildren}
			class:collapsed
			class:expanded={!collapsed}
			class:root
			aria-label="Toggle"
			data-tid={testId}
			onclick={stopPropagation(toggle)}
			role="button"
			tabindex="0"
			>{keyLabel}
			<span class="bracket">{openBracket} ... {closeBracket}</span>
		</span>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<span
			class="key"
			class:arrow={isExpandable && hasChildren}
			class:collapsed
			class:expanded={!collapsed}
			class:root
			aria-label="Toggle"
			data-tid={testId}
			onclick={stopPropagation(toggle)}
			role="button"
			tabindex="0">{keyLabel}<span class="bracket open">{openBracket}</span></span
		>
		<!-- children -->
		<ul>
			{#each children as [key, value] (key)}
				<li>
					<Self _key={key} _level={_level + 1} {defaultExpandedLevel} json={value} />
				</li>
			{/each}
		</ul>
		<span class="bracket close">{closeBracket}</span>
	{/if}
{:else if isExpandable}
	<!-- no childre -->
	<span class="key" class:root data-tid={testId}
		>{keyLabel}<span class="bracket">{openBracket} {closeBracket}</span></span
	>
{:else}
	<!-- key:value -->
	<span class="key-value" data-tid={testId}>
		<span class="key" class:root>{keyLabel}</span><span class="value {valueType}" {title}
			>{value}</span
		></span
	>
{/if}

<style lang="scss">
	.root,
	.root ~ ul,
	.root ~ span {
		// first arrow extra space
		margin-left: var(--padding);
	}

	ul {
		// reset
		margin: 0;
		padding: 0 0 0 var(--padding-2x);
		list-style: none;

		display: flex;
		flex-direction: column;
		gap: var(--padding-0_5x);
	}

	.key {
		display: inline-block;
		position: relative;

		color: var(--label-color);

		margin-right: var(--padding-0_5x);
	}

	.value {
		// Values can be strings of JSON and long. We want to break the value, so that the keys stay on the same line.
		word-break: break-all;
	}

	.arrow {
		touch-action: manipulation;
		cursor: pointer;
		// increase click area
		padding: 0 var(--padding-0_5x);
		// compensate click area
		transform: translateX(calc(-1 * var(--padding-0_5x)));
		min-width: var(--padding);

		display: inline-block;
		position: relative;
		border-radius: var(--padding-0_5x);

		&:hover {
			color: var(--primary-contrast);
			background: var(--primary);

			&::before {
				color: var(--primary);
			}

			.bracket {
				color: var(--primary-contrast);
			}
		}

		&::before {
			display: inline-block;
			position: absolute;
			left: 0;
			top: 0;
			// Move left to compensate for the padding of the ul
			// Move down to compensate for the gap between li
			transform: translate(calc(-1 * var(--padding-1_5x)), calc(0.8 * var(--padding)));
			font-size: var(--padding);
		}

		&.expanded::before {
			content: '▼';
		}

		&.collapsed::before {
			content: '▶';
		}
	}

	// value types
	.bracket {
		color: var(--json-bracket-color);
	}

	.value {
		color: var(--json-value-color);
	}

	.value.string {
		color: var(--json-string-color);
	}

	.value.number {
		color: var(--json-number-color);
	}

	.value.null {
		color: var(--json-null-color);
	}

	.value.principal {
		color: var(--json-principal-color);
	}

	.value.hash {
		color: var(--json-hash-color);
	}

	.value.bigint {
		color: var(--json-bigint-color);
	}

	.value.boolean {
		color: var(--json-boolean-color);
	}
</style>
