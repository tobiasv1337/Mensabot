FROM debian:bookworm-slim AS whisper_builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     git \
     build-essential \
     cmake \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git whisper.cpp

WORKDIR /src/whisper.cpp
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
  && cmake --build build -j --config Release

RUN set -eux; \
  mkdir -p /out; \
  if [ -f ./build/bin/whisper-cli ]; then cp ./build/bin/whisper-cli /out/whisper-cli; \
  elif [ -f ./build/bin/Release/whisper-cli ]; then cp ./build/bin/Release/whisper-cli /out/whisper-cli; \
  else \
    echo "Could not find whisper.cpp whisper-cli binary. Available executables:"; \
    find ./build -maxdepth 4 -type f -perm -111 -print; \
    exit 1; \
  fi; \
  # Copy shared libs used by whisper-cli (whisper.cpp can build shared-by-default).
  find ./build -maxdepth 6 -name 'lib*.so*' -exec cp -a {} /out/ ';' || true


FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ffmpeg \
     ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=whisper_builder /out/ /opt/whisper/
ENV LD_LIBRARY_PATH=/opt/whisper:${LD_LIBRARY_PATH}

COPY backend/apps/stt_server/ backend/apps/stt_server/
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir ./backend/apps/stt_server

EXPOSE 9100
CMD ["mensa-stt-server"]
