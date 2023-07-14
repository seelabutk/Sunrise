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


FROM base AS dev

WORKDIR /opt/src/renderkit
COPY external/ospray/scripts/superbuild .
RUN <<'EOF'
#!/usr/bin/env bash

set -euxo pipefail

renderkit_source_dir=/opt/src/renderkit
renderkit_binary_dir=/opt/var/renderkit
renderkit_prefix_dir=/opt/renderkit

# rm -rfv -- \
#     "${renderkit_binary_dir:?}/CMakeCache.txt" \
#     "${renderkit_binary_dir:?}/CMakeFiles" \
#     ##

cmake \
    -LA \
    -H"${renderkit_source_dir:?}" \
    -B"${renderkit_binary_dir:?}" \
    -DCMAKE_INSTALL_PREFIX:PATH="${renderkit_prefix_dir:?}" \
    -DCMAKE_BUILD_TYPE:STRING=Debug \
    -DINSTALL_IN_SEPARATE_DIRECTORIES:BOOL=OFF \
    -DBUILD_DEPENDENCIES_ONLY:BOOL=ON \
    ##

cmake \
    --build "${renderkit_binary_dir:?}" \
    ##

# cmake \
#     --install "${renderkit_binary_dir:?}" \
#     ##

ls -lah /opt/renderkit/*

EOF
ENV PATH="/opt/renderkit/bin${PATH:+:${PATH}}" \
    CPATH="/opt/renderkit/include${CPATH:+:${CPATH}}" \
    LIBRARY_PATH="/opt/renderkit/lib:/opt/renderkit/lib/intel64/gcc4.8${LIBRARY_PATH:+:${LIBRARY_PATH}}" \
    LD_LIBRARY_PATH="/opt/renderkit/lib:/opt/renderkit/lib/intel64/gcc4.8${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"


WORKDIR /opt/src/ospray
COPY external/ospray .
RUN <<'EOF'
#!/usr/bin/env bash
set -euxo pipefail

ospray_source_dir=/opt/src/ospray
ospray_binary_dir=/opt/var/ospray
ospray_prefix_dir=/opt/ospray

cmake \
    -LA \
    -H"${ospray_source_dir:?}" \
    -B"${ospray_binary_dir:?}" \
    -DCMAKE_INSTALL_PREFIX:PATH="${ospray_prefix_dir:?}" \
    -DCMAKE_BUILD_TYPE:STRING=Debug \
    ##

cmake \
    --build "${ospray_binary_dir:?}" \
    --parallel \
    ##

cmake \
    --install "${ospray_binary_dir:?}" \
    ##

ls -lah /opt/ospray/*

EOF
ENV PATH="/opt/ospray/bin${PATH:+:${PATH}}" \
    CPATH="/opt/ospray/include${CPATH:+:${CPATH}}" \
    LIBRARY_PATH="/opt/ospray/lib${LIBRARY_PATH:+:${LIBRARY_PATH}}" \
    LD_LIBRARY_PATH="/opt/ospray/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"



FROM base AS prod


ARG OSPRAY_VERSION=2.12.0
WORKDIR /opt/ospray-${OSPRAY_VERSION:?}
RUN --mount=type=cache,target=/tmp \
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


WORKDIR /opt/src/tapestry
COPY . .
RUN <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

source_dir=/opt/src/tapestry
binary_dir=${source_dir:?}/build
prefix_dir=/opt/tapestry

cmake \
    -H"${source_dir:?}" \
    -B"${binary_dir:?}" \
    -DCMAKE_INSTALL_PREFIX:PATH="${prefix_dir:?}" \
    -DCMAKE_BUILD_TYPE:STRING=RelWithDebInfo \
    ##

cmake \
    --build "${binary_dir:?}" \
    ##

cmake \
    --install "${binary_dir:?}" \
    ##

EOF

ENV PATH="/opt/tapestry/bin${PATH:+:${PATH}}"

CMD ["tapestryServer"]
