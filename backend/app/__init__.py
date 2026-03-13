import sys
import asyncio

# On Windows, Playwright requires ProactorEventLoop to handle subprocesses.
# Setting the policy here ensures it's applied as early as possible.
if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception as e:
        print(f"Error setting loop policy in __init__.py: {e}")
