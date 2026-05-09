import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { buildShellSessionConfig } from '../packages/squad-cli/src/cli/shell/session-config.js';

const TEST_ROOT = join(tmpdir(), `.test-shell-session-${randomBytes(4).toString('hex')}`);

describe('buildShellSessionConfig', () => {
  beforeEach(async () => {
    if (existsSync(TEST_ROOT)) {
      await rm(TEST_ROOT, { recursive: true, force: true });
    }
    await mkdir(join(TEST_ROOT, '.squad'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_ROOT)) {
      await rm(TEST_ROOT, { recursive: true, force: true });
    }
  });

  it('includes Cavemem recall guidance while keeping .squad canonical', async () => {
    const config = await buildShellSessionConfig({
      teamRoot: TEST_ROOT,
      agentName: 'tester',
      systemPrompt: 'You are a test agent.',
    });

    expect(config.systemMessage?.mode).toBe('append');
    const content = config.systemMessage?.content ?? '';
    expect(content).toContain('## Memory & Recall');
    expect(content).toContain('Treat `.squad/` files as the canonical team memory and source of truth.');
    expect(content).toContain('If a Cavemem MCP server is available, use it for cross-session recall');
    expect(content).toContain('write durable conclusions back into the appropriate `.squad/` files');
  });
});
