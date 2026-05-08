import path from 'node:path';
import { FSStorageProvider } from '../sdk-local.js';

const storage = new FSStorageProvider();

export type CommunicationStyle =
  | 'normal'
  | 'caveman-lite'
  | 'caveman-full'
  | 'caveman-ultra'
  | 'caveman-wenyan-lite'
  | 'caveman-wenyan'
  | 'caveman-wenyan-ultra';

export type CommunicationStyleTarget = 'agent' | 'coordinator' | 'none';

const VALID_STYLES = new Set<CommunicationStyle>([
  'normal',
  'caveman-lite',
  'caveman-full',
  'caveman-ultra',
  'caveman-wenyan-lite',
  'caveman-wenyan',
  'caveman-wenyan-ultra',
]);

export function normalizeCommunicationStyle(value: unknown): CommunicationStyle | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;

  const aliases: Record<string, CommunicationStyle> = {
    normal: 'normal',
    off: 'normal',
    none: 'normal',
    caveman: 'caveman-full',
    lite: 'caveman-lite',
    full: 'caveman-full',
    ultra: 'caveman-ultra',
    wenyan: 'caveman-wenyan',
    'wenyan-lite': 'caveman-wenyan-lite',
    'wenyan-full': 'caveman-wenyan',
    'wenyan-ultra': 'caveman-wenyan-ultra',
    'caveman-lite': 'caveman-lite',
    'caveman-full': 'caveman-full',
    'caveman-ultra': 'caveman-ultra',
    'caveman-wenyan-lite': 'caveman-wenyan-lite',
    'caveman-wenyan': 'caveman-wenyan',
    'caveman-wenyan-full': 'caveman-wenyan',
    'caveman-wenyan-ultra': 'caveman-wenyan-ultra',
  };

  return aliases[trimmed];
}

export function isCommunicationStyle(value: unknown): value is CommunicationStyle {
  return typeof value === 'string' && VALID_STYLES.has(value as CommunicationStyle);
}

export function getCommunicationStyleLabel(style: CommunicationStyle): string {
  switch (style) {
    case 'normal':
      return 'normal';
    case 'caveman-lite':
      return 'caveman lite';
    case 'caveman-full':
      return 'caveman full';
    case 'caveman-ultra':
      return 'caveman ultra';
    case 'caveman-wenyan-lite':
      return 'caveman wenyan-lite';
    case 'caveman-wenyan':
      return 'caveman wenyan';
    case 'caveman-wenyan-ultra':
      return 'caveman wenyan-ultra';
  }
}

function buildLevelRules(style: Exclude<CommunicationStyle, 'normal'>): string[] {
  switch (style) {
    case 'caveman-lite':
      return [
        '- Lite mode. Keep grammar intact, but remove filler, hedging, and pleasantries.',
        '- Professional tone still OK. Prefer short sentences.',
      ];
    case 'caveman-full':
      return [
        '- Full mode. Drop articles when safe. Fragments OK. Short synonyms preferred.',
        '- Pattern: [thing] [action] [reason]. [next step].',
      ];
    case 'caveman-ultra':
      return [
        '- Ultra mode. Compress aggressively. Use abbreviations like DB/auth/config/req/res when clarity stays exact.',
        '- Use arrows for causality when useful: X -> Y.',
      ];
    case 'caveman-wenyan-lite':
      return [
        '- Wenyan-lite mode. Semi-classical terseness. Keep technical identifiers exact.',
        '- Prefer very short phrasing, but preserve clarity.',
      ];
    case 'caveman-wenyan':
      return [
        '- Wenyan mode. Maximum classical terseness while preserving technical substance.',
        '- Keep code, API names, paths, and errors exact.',
      ];
    case 'caveman-wenyan-ultra':
      return [
        '- Wenyan-ultra mode. Extreme compression. Use only when technical meaning remains unambiguous.',
        '- Keep code, API names, paths, and errors exact.',
      ];
  }
}

export function buildCommunicationStyleBlock(
  style: CommunicationStyle,
  target: CommunicationStyleTarget = 'agent',
): string {
  if (style === 'normal' || target === 'none') return '';

  const levelRules = buildLevelRules(style);
  const header = target === 'coordinator'
    ? '## Communication Style Override (Coordinator-Safe Caveman)'
    : '## Communication Style Override (Caveman)';

  const shared = [
    '- Technical substance must remain exact. Only fluff dies.',
    '- Drop filler, pleasantries, and hedging.',
    '- Code blocks, commands, file paths, API names, identifiers, versions, and quoted error strings stay exact.',
    '- Use normal language instead for security warnings, destructive confirmations, or multi-step instructions where compression could create ambiguity.',
    '- Stay in this mode for every response until explicitly changed.',
  ];

  const coordinatorOnly = [
    '- Preserve machine-readable response framing exactly when the system prompt requires it.',
    '- Never change required control tokens such as `ROUTE:`, `TASK:`, `CONTEXT:`, `DIRECT:`, `MULTI:`, `INIT_TEAM:`, `UNIVERSE:`, or `PROJECT:`.',
    '- Keep the control tokens exact, but make the values after them terse in the selected Caveman level.',
  ];

  const agentOnly = [
    '- Apply this style to agent-to-human replies and cross-agent narrative text.',
    '- Code, commits, and PR metadata should stay normal unless explicitly asked otherwise.',
  ];

  const lines = [
    header,
    ...shared,
    ...(target === 'coordinator' ? coordinatorOnly : agentOnly),
    ...levelRules,
  ];

  return lines.join('\n');
}

export function applyCommunicationStyleToPrompt(
  prompt: string,
  style: CommunicationStyle,
  target: CommunicationStyleTarget = 'agent',
): string {
  const block = buildCommunicationStyleBlock(style, target);
  return block ? `${prompt}\n\n${block}` : prompt;
}

export function readLegacyCommunicationStyle(teamRoot: string): CommunicationStyle | undefined {
  const configPath = path.join(teamRoot, '.squad', 'config.json');
  try {
    const raw = storage.readSync(configPath);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as {
      communicationStyle?: unknown;
      watch?: { communicationStyle?: unknown };
    };

    return normalizeCommunicationStyle(parsed.communicationStyle)
      ?? normalizeCommunicationStyle(parsed.watch?.communicationStyle);
  } catch {
    return undefined;
  }
}
