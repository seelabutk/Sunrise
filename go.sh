#!/usr/bin/env bash
# vim :set ts=4 sw=4 sts=4 et:
die() { printf $'Error: %s\n' "$*" >&2; exit 1; }
root=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
self=$(realpath "${BASH_SOURCE[0]:?}")
project=${root##*/}
pexec() { >&2 printf exec; >&2 printf ' %q' "$@"; >&2 printf '\n'; exec "$@"; }
#---

go---docker() {
    pexec "${self:?}" docker \
    exec "${self:?}" "$@"
}

go-build() {
    pexec "${self:?}" docker \
    exec "${self:?}" cmake build \
        ##
}

go-main() {
    pexec "${self:?}" docker \
    exec "${cmake_binary_dir:?}/main" \
        ##
}


#--- Docker

docker_source_dir=${root:?}
docker_tag=${project,,}:latest
docker_name=${project,,}
docker_build=(
    --progress=plain
)
docker_start=(
    --mount="type=bind,src=${root:?},dst=${root:?},readonly=false"
    --mount="type=bind,src=${HOME:?},dst=${HOME:?},readonly=false"
    --mount="type=bind,src=/etc/passwd,dst=/etc/passwd,readonly=true"
    --mount="type=bind,src=/etc/group,dst=/etc/group,readonly=true"
)
docker_exec=(
)

go-docker() {
    "${FUNCNAME[0]:?}-$@"
}

go-docker---dev() {
    docker_build+=(
        --target=dev
    )
    "${FUNCNAME[0]%%--*}-$@"
}

go-docker---prod() {
    docker_build+=(
        --target=prod
    )
    "${FUNCNAME[0]%%--*}-$@"
}

go-docker-build() {
    pexec docker build \
        --tag "${docker_tag:?}" \
        "${docker_source_dir:?}" \
        "${docker_build[@]}" \
        ##
}

go-docker-start() {
    pexec docker run \
        --rm \
        --init \
        --detach \
        --name "${docker_name:?}" \
        "${docker_start[@]}" \
        "${docker_tag:?}" \
        sleep infinity \
        ##
}

go-docker-stop() {
    pexec docker stop \
        --time 0 \
        "${docker_name:?}" \
        ##
}

go-docker-exec() {
    local tty
    if [ -t 0 ]; then
        tty=
    fi

    pexec docker exec \
        ${tty+--tty} \
        --interactive \
        --detach-keys="ctrl-q,ctrl-q" \
        --user "$(id -u):$(id -g)" \
        --workdir "${PWD:?}" \
        --env USER \
        --env HOSTNAME \
        "${docker_name:?}" \
        "$@"
}


#---

cmake_source_dir=${root:?}
cmake_binary_dir=${cmake_source_dir:?}/build
cmake_prefix_dir=${cmake_binary_dir:?}/stage
cmake_configure=(
    -DCMAKE_BUILD_TYPE:STRING=Debug
)
cmake_build=(
)
cmake_install=(
)

go-cmake() {
    "${FUNCNAME[0]:?}-$@"
}

go-cmake-clean() {
    pexec rm -rfv -- \
        "${cmake_binary_dir:?}" \
        ##
}

go-cmake-configure() {
    pexec cmake \
        -H"${cmake_source_dir:?}" \
        -B"${cmake_binary_dir:?}" \
        -DCMAKE_INSTALL_PREFIX:PATH="${cmake_prefix_dir:?}" \
        "${cmake_configure[@]}" \
        ##
}

go-cmake-build() {
    pexec cmake \
        --build "${cmake_binary_dir:?}" \
        "${cmake_build[@]}" \
        ##
}

go-cmake-install() {
    pexec cmake \
        --install "${cmake_binary_dir:?}" \
        "${cmake_install[@]}" \
        ##
}


#---
test -f "${root:?}/env.sh" && source "${_:?}"
"go-$@"
