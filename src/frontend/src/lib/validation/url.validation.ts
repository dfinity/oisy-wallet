import { createUrlSchema } from '@dfinity/zod-schemas';

export const UrlSchema = createUrlSchema({
	additionalProtocols: ['wss:'],
	allowHttpLocally: false
});
