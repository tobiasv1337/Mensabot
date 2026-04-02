# Backend Scripts

> Docs: [Main README](../../README.md) | [Backend README](../README.md) | [MCP server README](../apps/mcp-server/README.md)

The `backend/scripts/` directory contains small helper scripts for maintainers. These are not runtime services and they are not required for normal application use.

## Included Scripts

| Script | Purpose | How to run |
| --- | --- | --- |
| `list_mcp_tools.py` | Connect to the local FastMCP app and print registered tool metadata | run it from the `backend/apps/mcp-server` environment |
| `sync_versions.py` | Propagate the root `VERSION` value, refresh Python lock/env state, and rebuild the frontend | run it from the repository root |

## `list_mcp_tools.py`

Useful for:

- verifying that all tools are registered
- checking generated schemas
- debugging changes to tool definitions

Run it like this:

```bash
cd backend/apps/mcp-server
uv sync
uv run python ../../scripts/list_mcp_tools.py
```

## `sync_versions.py`

This script reads the repository [`VERSION`](../../VERSION) file and updates:

- `backend/apps/api_backend/pyproject.toml`
- `backend/apps/mcp-server/pyproject.toml`
- `backend/apps/stt_server/pyproject.toml`
- `backend/libs/mensabot-backend-core/pyproject.toml`
- `backend/libs/mensabot-common/pyproject.toml`
- `backend/libs/openmensa/pyproject.toml`
- `frontend/package.json`
- `frontend/package-lock.json`

After updating the version metadata it also runs:

- `uv lock` in every backend app and library package
- `uv sync --locked` in every backend app and library package
- `npm run build` in `frontend`

Run it from the repository root:

```bash
uv run python backend/scripts/sync_versions.py
```

If you only want the manifest edits and want to skip the follow-up commands:

```bash
uv run python backend/scripts/sync_versions.py --versions-only
```

## Notes

- the scripts assume repository-local paths
- `sync_versions.py` is intentionally strict and fails if expected replacement patterns do not match
- `sync_versions.py` defaults to the full version-sync pipeline; use `--skip-uv-lock`, `--skip-uv-sync`, or `--skip-frontend-build` when you need to suppress specific stages
- if new packages are added, check whether version syncing should be extended as well

## Related README Files

- [Main README](../../README.md)
- [Backend README](../README.md)
- [MCP server README](../apps/mcp-server/README.md)
