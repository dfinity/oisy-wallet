// A single reused `Intl.Collator` is faster/more consistent than constructing one per comparison.
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// eslint-disable-next-line local-rules/prefer-object-params -- This is a sort function, so the parameters will be provided not as an object but as separate arguments.
export const compareNatural = (a: string, b: string): number => naturalCollator.compare(a, b);
