import uvicorn

if __name__ == "__main__":
    # Simplified entry point. The sync-threaded provider approach 
    # removes the need for asyncio loop policy hacks on Windows.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True, log_level="info")
