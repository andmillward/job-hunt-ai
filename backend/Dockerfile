FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# gcc and libpq-dev for psycopg2
# curl for healthchecks
# playwright dependencies for chromium
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers and their system dependencies
RUN playwright install --with-deps chromium

COPY . .

EXPOSE 8080

# Use the run.py entrypoint to ensure Windows compatibility fixes don't break Linux,
# although in Docker we'll likely be running the app.main:app directly via uvicorn.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
