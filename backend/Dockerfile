FROM python:3.12-slim
WORKDIR /app
ARG WITH_ML=false
COPY requirements.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements.txt && if [ "$WITH_ML" = "true" ]; then pip install --no-cache-dir -r requirements-ml.txt; fi
COPY . .
ENV DATA_DIR=/data
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
