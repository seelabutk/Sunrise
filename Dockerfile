FROM ubuntu:22.04 AS base
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y \
        cmake \
        gcc \
        g++ \
        libx11-dev \
        libglu1-mesa-dev \
        xorg-dev \
        libglfw3-dev \
        curl \
        gdb \
        git \
        python3 \
        python3-pip \
        python3-virtualenv \
    && rm -rf /var/lib/apt/lists/*

# UNCOMMENT FOR PROD
# ENTRYPOINT ["/bin/bash"]
# 
# COPY go.sh go.sh
# CMD ["go.sh", "--server"]

ARG OSPRAY_VERSION=3.1.0
# ARG OSPRAY_VERSION=2.12.0

FROM base AS dev
WORKDIR /opt/ospray-${OSPRAY_VERSION:?}
RUN --mount=type=cache,id=ospray,target=/tmp \
    curl \
        --continue-at - \
        --location \
        https://github.com/ospray/ospray/releases/download/v${OSPRAY_VERSION:?}/ospray-${OSPRAY_VERSION:?}.x86_64.linux.tar.gz \
        --output /tmp/ospray-${OSPRAY_VERSION:?}.x86_64.linux.tar.gz \
    && \
    tar \
        --extract \
        --file=/tmp/ospray-${OSPRAY_VERSION:?}.x86_64.linux.tar.gz \
        --strip-components=1 \
        --directory=/opt/ospray-${OSPRAY_VERSION:?} \
    && \
    true
ENV PATH="/opt/ospray-${OSPRAY_VERSION:?}/bin${PATH:+:${PATH}}" \
    CPATH="/opt/ospray-${OSPRAY_VERSION:?}/include${CPATH:+:${CPATH}}" \
    LIBRARY_PATH="/opt/ospray-${OSPRAY_VERSION:?}/lib${LIBRARY_PATH:+:${LIBRARY_PATH}}" \
    LD_LIBRARY_PATH="/opt/ospray-${OSPRAY_VERSION:?}/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"

FROM base AS prod
COPY --from=dev /opt/ospray-${OSPRAY_VERSION:?} /opt/ospray-${OSPRAY_VERSION:?}
ENV PATH="/opt/ospray-${OSPRAY_VERSION:?}/bin${PATH:+:${PATH}}" \
    CPATH="/opt/ospray-${OSPRAY_VERSION:?}/include${CPATH:+:${CPATH}}" \
    LIBRARY_PATH="/opt/ospray-${OSPRAY_VERSION:?}/lib${LIBRARY_PATH:+:${LIBRARY_PATH}}" \
    LD_LIBRARY_PATH="/opt/ospray-${OSPRAY_VERSION:?}/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"


COPY . /opt/src/sunrise
RUN --mount=type=cache,id=pip,target=/tmp <<'EOF'
#!/usr/bin/env bash
set -euxo pipefail

python3 -m virtualenv /opt/var/sunrise

PIP_CACHE_DIR=/tmp \
/opt/var/sunrise/bin/pip install \
    --disable-pip-version-check \
    /opt/src/sunrise[prod] \
##
EOF

ENV PATH="/opt/var/sunrise/bin${PATH:+:${PATH}}" \
    PYTHONPATH="/opt/var/sunrise/lib/python3.10/site-packages${PYTHONPATH:+:${PYTHONPATH}}"
