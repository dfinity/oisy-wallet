export const enumFromStringExists = <T extends object>({
	obj,
	value
}: {
	obj: T;
	value: string | null;
}): boolean => Object.values(obj).includes(value);
