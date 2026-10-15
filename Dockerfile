FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set permissions for upload and staging directories
RUN mkdir -p /app/uploads/global /app/uploads/slots /app/staging/dataset /app/staging/kernel /app/output && \
    chmod -R 777 /app/uploads /app/staging /app/output

ENV PORT=7860
EXPOSE 7860

CMD ["python3", "app.py"]
