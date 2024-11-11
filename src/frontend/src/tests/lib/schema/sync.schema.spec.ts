import { SyncStateSchema } from '$lib/schema/sync.schema';

describe('sync.schema', () => {
	it('should validate correct enum values', () => {
		expect(SyncStateSchema.safeParse('idle').success).toBe(true);
		expect(SyncStateSchema.safeParse('in_progress').success).toBe(true);
		expect(SyncStateSchema.safeParse('error').success).toBe(true);
	});

	it('should reject incorrect values', () => {
		expect(SyncStateSchema.safeParse('completed').success).toBe(false);
		expect(SyncStateSchema.safeParse('not_started').success).toBe(false);
		expect(SyncStateSchema.safeParse(123).success).toBe(false);
		expect(SyncStateSchema.safeParse(null).success).toBe(false);
		expect(SyncStateSchema.safeParse(undefined).success).toBe(false);
	});
});
