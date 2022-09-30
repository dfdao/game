import { Abstract } from './utility';

export type TokenType = Abstract<number, 'TokenType'>;

export const TokenType = {
  Unknown: 0 as TokenType,
  Artifact: 1 as TokenType,
  Spaceship: 2 as TokenType,
} as const;

/**
 * Mapping from TokenType to pretty-printed names.
 */
export const TokenTypeNames = {
  [TokenType.Unknown]: 'Unknown',
  [TokenType.Artifact]: 'Artifact',
  [TokenType.Spaceship]: 'Spaceship',
} as const;
