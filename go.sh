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

go-data() {
    pexec "${self:?}" "$@" \
    ##
}

# Upload a zip file of archived data of specified version
go---upload() {
    version=${1:?need version (e.g. 1)}
    pexec cp \
        "${root:?}/data/sunrise-data-v${version}.zip" \
        /opt/nginx/usr/share/nginx/html/accona.eecs.utk.edu \
    ##
}

# Compress data into specified version package zip file
go---archive() {
    version=${1:?need version (e.g. 1)}
    cd "${root:?}" && \
    pexec zip \
        --recurse-paths \
        --compression-method store \
        "${root:?}/data/sunrise-data-v${version}.zip" \
        "data/earth/OSPGeometry.mesh.index.vec4ui.bin" \
        "data/earth/OSPGeometry.mesh.vertex.normal.vec3f.bin" \
        "data/earth/OSPGeometry.mesh.vertex.position.vec3f.bin" \
        "data/earth/OSPGeometry.mesh.vertex.texcoord.vec2f.bin" \
        "data/earth/OSPTexture.texture2d.data.vec3f.bin" \
        "data/space/OSPTexture.texture2d.data.vec2f.bin" \
        "data/observation/OSPGeometricModel.index.vec1uc.bin" \
        "data/observation_0000223/OSPGeometricModel.index.vec1uc.bin" \
        "data/observation_0000172/OSPGeometricModel.index.vec1uc.bin" \
        "data/observation_0000341/OSPGeometricModel.index.vec1uc.bin" \
        "data/park/OSPGeometry.mesh.index.vec4ui.bin" \
        "data/park/OSPGeometry.mesh.vertex.normal.vec3f.bin" \
        "data/park/OSPGeometry.mesh.vertex.position.vec3f.bin" \
        "data/park/OSPGeometry.mesh.vertex.texcoord.vec2f.bin" \
        "data/pink0/OSPTexture.texture2d.data.vec3f.bin" \
        "data/pink1/OSPTexture.texture2d.data.vec3f.bin" \
        "data/pink2/OSPTexture.texture2d.data.vec3f.bin" \
        "data/pink3/OSPTexture.texture2d.data.vec3f.bin" \
        "data/observations" \
        "data/city" \
    ##
}

# Download zip file of specified version to local directory
go---download() {
    version=${1:?need version (e.g. 1)}

    if ! [ -d "${root:?}/data" ]; then
        >&2 printf $'Error: Directory not found: %s\n' "${root:?}/data"
        >&2 printf $'Error: Create directory and symlink to large storage location before extracting!\n'
        return 1
    fi

    wget \
        -O "${root:?}/data/sunrise-data-v${version:?}.zip" \
        https://accona.eecs.utk.edu/sunrise-data-v${version:?}.zip \
    ##
}

# Extract data from zip file to specified directory
go---extract() {
    version=${1:?need version (e.g. 1)}
    path=${root:?}/data/sunrise-data-v${version}.zip

    pexec unzip \
        -d "${root:?}" \
        "${path:?}" \
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

go-city() {
    pexec "${self:?}" \
        --docker \
        --virtualenv \
        --city \
    ##
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
    SUNRISE_SCENE_PATH=${root:?}/data \
    pexec python -m \
        sunrise.server \
    ##
}

go---city() {
    PYTHONPATH=${root:?}/src${PYTHONPATH:+:${PYTHONPATH:?}} \
    SUNRISE_SCENE_PATH=${root:?}/data \
    pexec python -m \
        city.server \
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
    echo "${root:?}[server]"
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
        --ulimit=core=0 \
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
    echo "${root:?}[server]"
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
