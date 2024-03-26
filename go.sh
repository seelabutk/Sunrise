#!/usr/bin/env bash
# vim :set ts=4 sw=4 sts=4 et:
die() { printf $'Error: %s\n' "$*" >&2; exit 1; }
root=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
self=$(realpath "${BASH_SOURCE[0]:?}")
project=${root##*/}
echo "Project: ${project}"
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

# TODO: add network create command 
# NOTE: --driver overlay

docker_service_name="sunrise-globe-dev"
service_bind=127.59.4.179 # globe dev 
service_port=36277 # globe dev
go-service() {
    pexec docker service create\
        --name "${docker_service_name:?}" \
        --publish "${service_port:?}:${service_port:?}" \
        --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=true" \
        --replicas=1 \
        \
        --env="FLASK_APP=sunrise.server:app" \
        --env="SUNRISE_SCENE_PATH=${root:?}/data" \
        sunrise-demo
        echo "Hello World" \
        ##

#        flask run \
#            --debug \
#            --host "0.0.0.0" \
#            --port "${service_port:?}" \

        # sleep infinity
}

go-server() {
    pexec "${self:?}" \
        --docker \
        --virtualenv \
        --server \
    ##
}

#server_port=33267
#server_bind=127.202.208.70
server_bind=0.0.0.0
server_port=5000
go---server() {
    PYTHONPATH=${root:?}/src${PYTHONPATH:+:${PYTHONPATH:?}} \
    FLASK_APP=sunrise.server:app \
    SUNRISE_SCENE_PATH=${root:?}/data \
    flask run \
        --debug \
        --host "${server_bind:?}" \
        --port "${server_port:?}" \
    ##
}

go---session() {
    echo "Session Project: ${project:?}"
    pexec tmux new -session -A -s "${project:?}" "${self:?}" "$@"
}

go---uwsgi() {
    pexec uwsgi \
        --enable-thread \
        --logger stdio \
        --lazy \
        --module sunrise.server:app \
        --http-socket "${service_bind:?}:${service_port:?}" \
        --processes 4 \
        --env SUNRISE_SCENE_PATH="${root:?}/data" \
    ##
}

go-uwsgi() {
    pexec "${self:?}" \
        --session \
        --docker \
        --virtualenv \
        --uwsgi \
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
# TODO: Add deploy script for docker

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
    docker_tag+=-prod
    "${FUNCNAME[0]%%--*}-$@"
}

go-user() {
    echo ${project:?}
    echo ${self:?}
}

go-docker-build() {
    pexec docker build \
        --tag "${docker_tag:?}" \
        "${docker_source_dir:?}" \
        "${docker_build[@]}" \
        ##
}

go-docker-start() {
    default=( sleep infinity )
    pexec docker run \
        -it \
        --rm \
        --init \
        --detach \
        --name "${docker_name:?}" \
        "${docker_start[@]}" \
        "${docker_tag:?}" \
        # "${@:-${default[@]}}" \
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

# docker_service_name=${project,,}
# docker_service_create=(
# )

go-docker-service() {
    "${FUNCNAME[0]:?}-$@"
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
