# MCP Integration — Configuration and Samples

MCP (Model Context Protocol) servers extend Squad with tools for external services — Trello, Aspire dashboards, Azure, Notion, and more. The user configures MCP servers in their environment; Squad discovers and uses them.

## Config File Locations

Users configure MCP servers at these locations (checked in priority order):
1. **Repository-level:** `.copilot/mcp-config.json` (team-shared, committed to repo)
2. **Workspace-level:** `.vscode/mcp.json` (VS Code workspaces)
3. **User-level:** `~/.copilot/mcp-config.json` (personal)
4. **CLI override:** `--additional-mcp-config` flag (session-specific)

## Sample Config — Trello

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@trello/mcp-server"],
      "env": {
        "TRELLO_API_KEY": "${TRELLO_API_KEY}",
        "TRELLO_TOKEN": "${TRELLO_TOKEN}"
      }
    }
  }
}
```

## Sample Config — GitHub

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Sample Config — Cavemem

```json
{
  "mcpServers": {
    "cavemem": {
      "command": "cavemem",
      "args": ["mcp"]
    }
  }
}
```

Use Cavemem for searchable cross-session recall. Keep `.squad/` files as the canonical team memory; use Cavemem to find past observations, then write durable decisions back into `.squad/`.

## Sample Config — Azure

```json
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp-server"],
      "env": {
        "AZURE_SUBSCRIPTION_ID": "${AZURE_SUBSCRIPTION_ID}",
        "AZURE_CLIENT_ID": "${AZURE_CLIENT_ID}",
        "AZURE_CLIENT_SECRET": "${AZURE_CLIENT_SECRET}",
        "AZURE_TENANT_ID": "${AZURE_TENANT_ID}"
      }
    }
  }
}
```

## Sample Config — Aspire

```json
{
  "mcpServers": {
    "aspire": {
      "command": "npx",
      "args": ["-y", "@aspire/mcp-server"],
      "env": {
        "ASPIRE_DASHBOARD_URL": "${ASPIRE_DASHBOARD_URL}"
      }
    }
  }
}
```

## Authentication Notes

- **GitHub MCP requires a separate token** from the `gh` CLI auth. Generate at https://github.com/settings/tokens
- **Cavemem requires the `cavemem` CLI** on `PATH` so Squad can launch `cavemem mcp`
- **Trello requires API key + token** from https://trello.com/power-ups/admin
- **Azure requires service principal credentials** — see Azure docs for setup
- **Aspire uses the dashboard URL** — typically `http://localhost:18888` during local dev

Auth is a real blocker for some MCP servers. Users need separate tokens for GitHub MCP, Azure MCP, Trello MCP, etc. This is a documentation problem, not a code problem.
