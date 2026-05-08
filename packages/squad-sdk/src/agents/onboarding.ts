/**
 * Agent Onboarding Module (M2-10, PRD #111)
 * 
 * Handles runtime agent onboarding with context-aware charter generation.
 * Creates agent directory, charter, and history with project context.
 * 
 * @module agents/onboarding
 */

import { join } from 'path';
import type { StorageProvider } from '../storage/storage-provider.js';
import { FSStorageProvider } from '../storage/fs-storage-provider.js';
import type { SquadState } from '../state/squad-state.js';

// ============================================================================
// Onboarding Types
// ============================================================================

/**
 * Agent onboarding options.
 */
export interface OnboardOptions {
  /** Root directory for Squad team files */
  teamRoot: string;
  /** Agent name (kebab-case) */
  agentName: string;
  /** Agent role identifier */
  role: string;
  /** Display name (optional, defaults to titlecased name) */
  displayName?: string;
  /** Project context for charter generation */
  projectContext?: string;
  /** User name for initial history entry */
  userName?: string;
  /** Custom charter template override */
  charterTemplate?: string;
}

/**
 * Agent onboarding result.
 */
export interface OnboardResult {
  /** Created file paths */
  createdFiles: string[];
  /** Agent directory path */
  agentDir: string;
  /** Charter file path */
  charterPath: string;
  /** History file path */
  historyPath: string;
}

// ============================================================================
// Default Charter Templates
// ============================================================================

interface RoleCharterProfile {
  title: string;
  summary: string;
  responsibilities: string[];
  workStyle: string[];
}

function buildRoleCharter(displayName: string, context: string | undefined, profile: RoleCharterProfile): string {
  return `# ${displayName} — ${profile.title}

${profile.summary}

## Project Context

${context || 'Context will be provided by the team.'}

## Responsibilities

${profile.responsibilities.map(item => `- ${item}`).join('\n')}

## Work Style

${profile.workStyle.map(item => `- ${item}`).join('\n')}
`;
}

/**
 * Default charter templates for standard roles.
 */
const CHARTER_TEMPLATES: Record<string, (displayName: string, context?: string) => string> = {
  'lead': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Technical Lead',
    summary: 'Technical lead for architecture, delegation, and final technical calls.',
    responsibilities: [
      'Set technical direction and scope the work',
      'Route decisions to the right specialist',
      'Review proposals and break ties quickly',
    ],
    workStyle: [
      'Favor maintainable designs over clever ones',
      'Delegate early when another specialist is a better fit',
      'Make trade-offs explicit when speed and quality compete',
    ],
  }),
  'developer': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Software Developer',
    summary: 'Builder focused on shipping features, fixes, and solid code.',
    responsibilities: [
      'Implement features and bug fixes',
      'Keep code readable, tested, and easy to extend',
      'Surface implementation trade-offs that matter to the team',
    ],
    workStyle: [
      'Prefer simple designs and local reasoning',
      'Write tests with the change when behavior moves',
      'Raise ambiguity early instead of coding on guesses',
    ],
  }),
  'tester': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Quality Assurance',
    summary: 'Quality specialist for coverage, regression risk, and validation.',
    responsibilities: [
      'Design test strategy for risky behavior',
      'Find edge cases, regressions, and failure modes',
      'Keep verification practical and repeatable',
    ],
    workStyle: [
      'Think about how the system breaks before how it passes',
      'Automate repeatable checks whenever possible',
      'Report risk clearly, with repro steps when available',
    ],
  }),
  'scribe': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Documentation Specialist',
    summary: 'Documentation owner for history, decisions, and institutional memory.',
    responsibilities: [
      'Keep team records current and easy to scan',
      'Preserve why decisions were made, not just what changed',
      'Turn noisy work into usable summaries',
    ],
    workStyle: [
      'Prefer concise records over exhaustive narration',
      'Organize information so future sessions can reload quickly',
      'Standardize wording and structure where it improves retrieval',
    ],
  }),
  'ralph': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Work Monitor',
    summary: 'Dispatch monitor that keeps the board moving and spots blockers fast.',
    responsibilities: [
      'Scan for pending work and assign it to the right owner',
      'Track PR, CI, and review state across the queue',
      'Report blockers and keep idle time near zero',
    ],
    workStyle: [
      'Process the full queue, not just the first obvious item',
      'Escalate blockers quickly and with concrete evidence',
      'Do not absorb implementation work that should be routed away',
    ],
  }),
  'designer': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'User Experience Designer',
    summary: 'UX designer for interfaces, flows, and interaction quality.',
    responsibilities: [
      'Shape UI flows and interaction patterns',
      'Protect visual consistency and usability',
      'Translate user needs into implementation-ready direction',
    ],
    workStyle: [
      'Start from user goals, not component inventories',
      'Balance clarity, delight, and implementation cost',
      'Iterate quickly when feedback exposes friction',
    ],
  }),
  'architect': (displayName: string, context?: string) => buildRoleCharter(displayName, context, {
    title: 'Software Architect',
    summary: 'System designer responsible for structure, standards, and long-range technical shape.',
    responsibilities: [
      'Define system boundaries and integration strategy',
      'Evaluate technical options and their long-term cost',
      'Make scalability and maintainability concerns concrete',
    ],
    workStyle: [
      'Optimize for coherent systems, not isolated wins',
      'State trade-offs plainly when recommending direction',
      'Bias toward patterns the team can operate confidently',
    ],
  }),
};

/**
 * Generate a generic charter when no template matches.
 */
function generateGenericCharter(displayName: string, role: string, context?: string): string {
  return `# ${displayName} — ${titleCase(role)}

Team member focused on ${role} responsibilities.

## Project Context

${context || 'Context will be provided by the team.'}

## Responsibilities

- Own the ${role} work that lands here
- Keep outputs clear enough for the next teammate to pick up
- Surface decisions or blockers that materially affect the team

## Work Style

- Start from current context before changing direction
- Prefer direct, specific communication over vague status
- Keep solutions simple unless complexity buys something real
`;
}

/**
 * Generate history.md content with project context.
 */
function generateHistory(
  displayName: string,
  role: string,
  projectContext?: string,
  userName?: string
): string {
  const now = new Date().toISOString().split('T')[0];
  
  return `# Project Context

${userName ? `- **Owner:** ${userName}\n` : ''}- **Agent:** ${displayName}
- **Role:** ${titleCase(role)}
- **Onboarded:** ${now}

## Core Context

${projectContext || 'Project context will be provided by the team.'}

## Recent Updates

📌 Agent ${displayName} onboarded on ${now}

## Learnings

Ready to contribute to the team.
`;
}

/**
 * Convert kebab-case or snake_case to Title Case.
 */
function titleCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// Onboarding Functions
// ============================================================================

/**
 * Onboard a new agent to the Squad.
 * 
 * Creates:
 * - Agent directory at .squad/agents/{name}/
 * - charter.md from role template + project context
 * - history.md with project description and tech stack
 * 
 * @param options - Onboarding options
 * @returns Result with created file paths
 */
export async function onboardAgent(
  options: OnboardOptions,
  storage: StorageProvider = new FSStorageProvider(),
  state?: SquadState,
): Promise<OnboardResult> {
  const {
    teamRoot,
    agentName,
    role,
    displayName,
    projectContext,
    userName,
    charterTemplate
  } = options;
  
  const createdFiles: string[] = [];
  
  // Validate inputs
  if (!teamRoot) {
    throw new Error('teamRoot is required');
  }
  if (!agentName) {
    throw new Error('agentName is required');
  }
  if (!role) {
    throw new Error('role is required');
  }
  
  // Normalize agent name (kebab-case)
  const normalizedName = agentName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  // Create agent directory
  const agentDir = join(teamRoot, '.squad', 'agents', normalizedName);
  if (await storage.exists(agentDir)) {
    throw new Error(`Agent directory already exists: ${agentDir}`);
  }
  
  // Write charter.md (storage.write auto-creates parent directories)
  
  // Determine display name
  const effectiveDisplayName = displayName || titleCase(normalizedName);
  
  // Generate charter
  let charterContent: string;
  if (charterTemplate) {
    charterContent = charterTemplate;
  } else {
    const templateFn = CHARTER_TEMPLATES[role.toLowerCase()];
    if (templateFn) {
      charterContent = templateFn(effectiveDisplayName, projectContext);
    } else {
      charterContent = generateGenericCharter(effectiveDisplayName, role, projectContext);
    }
  }
  
  // Generate history
  const historyContent = generateHistory(
    effectiveDisplayName,
    role,
    projectContext,
    userName
  );

  // Write agent files — use SquadState when available, raw storage otherwise
  const charterPath = join(agentDir, 'charter.md');
  const historyPath = join(agentDir, 'history.md');

  // When state is provided, prefer its underlying provider for consistency
  const effectiveStorage = state ? state.provider : storage;

  if (state) {
    // SquadState.agents.create() writes charter + generic history.
    // We write charter via state, then overwrite history with our richer template.
    await state.agents.create(normalizedName, charterContent);
    await effectiveStorage.write(historyPath, historyContent);
  } else {
    await effectiveStorage.write(charterPath, charterContent);
    await effectiveStorage.write(historyPath, historyContent);
  }
  createdFiles.push(charterPath, historyPath);
  
  return {
    createdFiles,
    agentDir,
    charterPath,
    historyPath
  };
}

/**
 * Update an agent's configuration to squad.config.ts (if it exists).
 * 
 * This is a helper function to add agent routing after onboarding.
 * Only works with TypeScript configs (JSON requires manual edit).
 * 
 * @param teamRoot - Team root directory
 * @param agentName - Agent name to add
 * @param role - Agent role
 * @returns True if config was updated, false if not found or JSON format
 */
export async function addAgentToConfig(
  teamRoot: string,
  agentName: string,
  role: string,
  storage: StorageProvider = new FSStorageProvider()
): Promise<boolean> {
  const configPath = join(teamRoot, 'squad.config.ts');
  
  if (!await storage.exists(configPath)) {
    return false; // No TypeScript config to update
  }
  
  try {
    const content = await storage.read(configPath);
    if (content === undefined) {
      return false;
    }
    
    // Simple heuristic: add routing rule if role matches common work types
    const workTypeMap: Record<string, string> = {
      'developer': 'feature-dev',
      'tester': 'testing',
      'scribe': 'documentation',
      'architect': 'architecture',
      'designer': 'design'
    };
    
    const workType = workTypeMap[role.toLowerCase()];
    if (!workType) {
      return false; // No obvious work type mapping
    }
    
    // Check if this work type already has a rule
    const workTypePattern = new RegExp(`workType:\\s*['"]${workType}['"]`);
    if (workTypePattern.test(content)) {
      return false; // Already has a rule for this work type
    }
    
    // Find the routing rules array and add new rule
    const rulesPattern = /rules:\s*\[([^\]]*)\]/s;
    const match = content.match(rulesPattern);
    
    if (!match) {
      return false; // Cannot parse rules array
    }
    
    const newRule = `      {
        workType: '${workType}',
        agents: ['@${agentName}'],
        confidence: 'high'
      }`;
    
    const updatedRules = match[1]!.trim() + ',\n' + newRule;
    const updatedContent = content.replace(
      rulesPattern,
      `rules: [\n${updatedRules}\n    ]`
    );
    
    await storage.write(configPath, updatedContent);
    return true;
  } catch (error) {
    // Silently fail if we can't parse/update the config
    return false;
  }
}
