// A single reused `Intl.Collator` is faster/more consistent than constructing one per comparison.
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// eslint-disable-next-line local-rules/prefer-object-params -- This is a sort function, so the parameters will be provided not as an object but as separate arguments.
export const compareNatural = (a: string, b: string): number => naturalCollator.compare(a, b);

// Trim and lower-case a free-text search filter once, so matchers can compare
// against a normalized form and callers can thread the result down without
// re-normalizing on every candidate.
export const normalizeTextFilter = (filter: string): string => filter.trim().toLowerCase();

// True when `value` contains `filter`, case-insensitively. `filter` is expected
// pre-normalized (see `normalizeTextFilter`).
export const textMatchesFilter = ({ value, filter }: { value: string; filter: string }): boolean =>
	value.toLowerCase().includes(filter);

// True when the filter is empty (match-all) or at least one candidate string
// contains it. Candidates are meant to be the user-facing — typically already
// localized — strings a row renders, so free-text search follows the user's
// language (e.g. a French "vendre" matches a row that renders "Vendre").
export const someTextMatchesFilter = ({
	values,
	filter
}: {
	values: string[];
	filter: string;
}): boolean => {
	const normalized = normalizeTextFilter(filter);
	return (
		normalized === '' || values.some((value) => textMatchesFilter({ value, filter: normalized }))
	);
};
