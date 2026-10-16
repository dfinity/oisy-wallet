import Spinner from '$lib/components/ui/Spinner.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('app startup spinner', () => {
	it('shows the same visor before the Svelte bundle loads', () => {
		const source = readFileSync(join(process.cwd(), 'src/frontend/src/app.html'), 'utf8');
		const document = new DOMParser().parseFromString(source, 'text/html');
		const startup = document.querySelector('body > #app-spinner');
		assertNonNullish(startup);

		const { container } = render(Spinner);
		const paths = startup.querySelectorAll('path');

		expect(paths).toHaveLength(2);
		expect(startup.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 46 40');
		expect(paths[0].getAttribute('d')).toBe(container.querySelector('path')?.getAttribute('d'));
		expect(paths[1].getAttribute('d')).toBe(paths[0].getAttribute('d'));
		expect(paths[0].getAttribute('opacity')).toBe('0.2');
		expect(paths[1].getAttribute('pathLength')).toBe('100');
		expect(paths[1].getAttribute('stroke-dasharray')).toBe('25 75');
		expect(startup.getAttribute('aria-hidden')).toBe('true');
	});
});
