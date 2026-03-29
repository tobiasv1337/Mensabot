# mensabot-common

> Docs: [Main README](../../../README.md) | [Backend README](../../README.md) | [Backend core README](../mensabot-backend-core/README.md) | [OpenMensa SDK README](../openmensa/README.md)

`mensabot-common` is the smallest shared backend package. It centralizes project version discovery and user-agent construction so every service identifies itself consistently at runtime.

## Public API

| Symbol | Purpose |
| --- | --- |
| `PROJECT_VERSION` | Cached project version string |
| `read_project_version()` | Resolve the version lazily |
| `build_user_agent(name)` | Build `<name>/<version>` user-agent strings |

## Version Resolution Order

`read_project_version()` resolves the version in this order:

1. `MENSABOT_VERSION` environment variable
2. the nearest `VERSION` file found while walking parent directories
3. fallback to `0.0.0`

That makes the helper usable:

- inside the repository
- from editable installs
- inside container images where the version might be injected explicitly

## Example

```python
from mensabot_common.version import build_user_agent

user_agent = build_user_agent("mensabot-mcp-server")
```

## Why It Matters

Several backend packages talk to external services such as OpenMensa and Overpass. Centralizing version and user-agent logic prevents drift between packages and keeps operational metadata predictable.

## Scope

Helpers added to this package should stay:

- backend-wide
- low-level
- dependency-light

Anything domain-specific belongs in [`mensabot-backend-core`](../mensabot-backend-core/README.md) instead.

## Typical Consumers

- [`openmensa-sdk`](../openmensa/README.md)
- [`mensabot-backend-core`](../mensabot-backend-core/README.md)
- [`mensa-mcp-server`](../../apps/mcp-server/README.md)

## Related README Files

- [Main README](../../../README.md)
- [Backend README](../../README.md)
- [Backend core README](../mensabot-backend-core/README.md)
- [OpenMensa SDK README](../openmensa/README.md)
