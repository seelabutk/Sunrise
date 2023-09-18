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
    exec "${self:?}" "$@" \
    ##
}

go---virtualenv() {
    pexec "${self:?}" virtualenv \
    exec "${self:?}" "$@" \
    ##
}

go-server() {
    pexec "${self:?}" --docker --virtualenv --server
}

go---server() {
    PYTHONPATH=${root:?}/src${PYTHONPATH:+:${PYTHONPATH:?}} \
    FLASK_APP=sunrise.server:app \
    SUNRISE_LIBOSPRAY_PATH=libospray.so \
    SUNRISE_SCENE_PATH=${root:?}/data \
    flask run \
        --debug \
    ##
}

go-main() {
    pexec "${self:?}" docker \
    exec "${root:?}/src/sunrise/main.py" \
    ##
}

go---debug() {
    ignore_dir=$(python3 \
        -c 'import sys; print(":".join(sys.path)[1:])' \
    )

    pexec gdb \
    -ex='set breakpoint pending on' \
    -ex='set pagination off' \
    -ex=start \
    -ex=continue \
    --args \
        python3 \
        -m trace \
        --trace \
        --ignore-dir="${ignore_dir:?}" \
            "${root:?}/src/main.py" \
    ##

}

go-debug() {
    pexec "${self:?}" docker \
    exec "${self:?}" --debug
}


#--- Docker

docker_source_dir=${root:?}
docker_tag=${project,,}:latest
docker_name=${project,,}
docker_build=(
    --progress=plain
)
docker_start=(
    --cap-add=SYS_PTRACE
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


#--- Python

virtualenv_path=${root:?}/venv

go-virtualenv() {
    "${FUNCNAME[0]:?}-$@"
}

go-virtualenv-create() {
    python3 -m virtualenv \
        "${virtualenv_path:?}" \
    ##
}

go-virtualenv-install() {
    "${virtualenv_path:?}/bin/pip" \
        install \
        --editable \
        "${root:?}[server]" \
    ##
}

go-virtualenv-exec() {
    source "${virtualenv_path:?}/bin/activate" \
    && \
    pexec "$@" \
    ##
}


#---
test -f "${root:?}/env.sh" && source "${_:?}"
"go-$@"
