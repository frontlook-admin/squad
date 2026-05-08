import {
  applyCommunicationStyleToPrompt,
  type CommunicationStyle,
} from '../../core/communication-style.js';
import type { WatchContext } from './types.js';

export function styleWatchPrompt(
  prompt: string,
  communicationStyle?: CommunicationStyle,
): string {
  return applyCommunicationStyleToPrompt(prompt, communicationStyle ?? 'normal', 'agent');
}

export function buildWatchAgentCommand(
  prompt: string,
  context: Pick<WatchContext, 'agentCmd' | 'copilotFlags' | 'communicationStyle'>,
): { cmd: string; args: string[] } {
  const styledPrompt = styleWatchPrompt(prompt, context.communicationStyle);

  if (context.agentCmd) {
    const parts = context.agentCmd.trim().split(/\s+/);
    return { cmd: parts[0]!, args: [...parts.slice(1), '-p', styledPrompt] };
  }

  const args = ['-p', styledPrompt];
  if (context.copilotFlags) args.push(...context.copilotFlags.trim().split(/\s+/));
  return { cmd: 'copilot', args };
}
