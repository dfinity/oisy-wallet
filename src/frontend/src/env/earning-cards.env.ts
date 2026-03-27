import earningCardsJson from '$env/earning-cards.json';
import { EarningCardsSchema } from '$env/schema/env-earning-cards.schema';
import type { EarningCards } from '$env/types/env.earning-cards';
import { z } from 'zod';

const parseResult = z.array(EarningCardsSchema).safeParse(earningCardsJson);
export const earningCards: EarningCards[] = parseResult.success ? parseResult.data : [];
