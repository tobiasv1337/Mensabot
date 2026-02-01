import asyncio
from fastmcp import Client
from mensa_mcp_server import mcp

async def async_main():
    print("Connecting to MCP server...")
    async with Client(mcp) as c:
        print("Connected! Listing tools...")
        tools = await c.list_tools()
        print(f"Found {len(tools)} tools:")
        for t in tools:
            print(t.name)
            print("  outputSchema present:", bool(t.outputSchema))
            if t.outputSchema:
                print("  outputSchema keys:", list(t.outputSchema.keys()))
            print("--- FULL PYDANTIC TOOL ---")
            print(t.model_dump())

def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
