FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x start.sh

# Dev: override with --reload via docker-compose volumes
# Prod (Railway): start.sh runs migrations then uvicorn with workers
CMD ["./start.sh"]
