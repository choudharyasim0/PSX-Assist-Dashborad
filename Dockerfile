FROM python:3.12-slim

WORKDIR /app
COPY app.py ./
COPY server/ ./server/
COPY web/ ./web/

ENV HOST=0.0.0.0
ENV PORT=7860

EXPOSE 7860
CMD ["python", "app.py"]
