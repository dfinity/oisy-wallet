import type { Contact } from '$declarations/backend/backend.did';

export const getMockContacts = ({ n, name }: { n: number; name?: string }): Contact[] =>
	Array(n)
		.fill(null)
		.map(
			(_, i) =>
				({
					id: BigInt(i),
					name: name ?? 'Testname',
					update_timestamp_ns: 12,
					addresses: []
				}) as unknown as Contact
		);
