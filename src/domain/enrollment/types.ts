import type { QuestionDTO } from '@db/repositories/types';

/**
 * Plain question shape used by enrollment / catalog domain helpers.
 * Alias of the repository DTO — one domain per question in the schema.
 */
export type QuestionRecord = QuestionDTO;
