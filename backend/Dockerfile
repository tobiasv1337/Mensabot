FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY backend/ backend/
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir \
     ./backend/libs/mensabot-common \
     ./backend/libs/mensabot-backend-core \
     ./backend/libs/openmensa \
     ./backend/apps/mcp-server \
     ./backend/apps/api_backend

EXPOSE 8000
CMD ["mensa-api-backend"]
