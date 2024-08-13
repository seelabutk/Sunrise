#!/usr/bin/env bash
# vim :set ts=4 sw=4 sts=4 et:
die() { printf $'Error: %s\n' "$*" >&2; exit 1; }
root=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
self=$(realpath "${BASH_SOURCE[0]:?}")
project=${root##*/}
pexec() { >&2 printf exec; >&2 printf ' %q' "$@"; >&2 printf '\n'; exec "${@:?pexec: missing command}"; }
prun() { >&2 printf exec; >&2 printf ' %q' "$@"; >&2 printf '\n'; "${@:?prun: missing command}"; }
next() { "${FUNCNAME[0]:?}-$@"; }
go() { go-"$@"; }
#---

docker_source_dir=${root:?}
docker_tag=${project,,}:latest
docker_name=${project,,}

go-Build-Image() {
    pexec docker build \
        --tag="${docker_tag:?}" \
        --target="dev" \
        --progress=plain \
        "${docker_source_dir:?}" \
    ##
}

go-Start-Container() {
    pexec docker run \
        -it \
        --rm \
        --init \
        --detach \
        --ulimit=core=0 \
        --cap-add=SYS_PTRACE \
        --net=host \
        --name="${docker_name:?}" \
        --mount="type=bind,src=${root:?},dst=${root:?},readonly=false" \
        --mount="type=bind,src=${HOME:?},dst=${HOME:?},readonly=false" \
        --mount="type=bind,src=/etc/passwd,dst=/etc/passwd,readonly=true" \
        --mount="type=bind,src=/etc/group,dst=/etc/group,readonly=true" \
        --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=false" \
        "${docker_tag:?}" \
        sleep infinity \
    ##
}

go-Stop-Container() {
    pexec docker stop \
        --time=0 \
        "${docker_name:?}" \
    ##
}

go-Invoke-Container() {
    local tty
    if [ -t 0 ]; then
        tty=
    fi

    pexec docker exec \
        ${tty+--tty} \
        --interactive \
        --detach-keys="ctrl-q,ctrl-q" \
        --user="$(id -u):$(id -g)" \
        --workdir="${PWD:?}" \
        --env=USER \
        --env=HOSTNAME \
        "${docker_name:?}" \
        "${@:?}" \
    ##
}

server_environment=${root:?}/venv

go-New-ServerEnvironment() {
    pexec "${self:?}" Invoke-Container \
    "${self:?}" --New-ServerEnvironment \
    ##
}

go---New-ServerEnvironment() {
    pexec python3 -m venv \
        "${server_environment:?}" \
    ##
}

go-Initialize-ServerEnvironment() {
    pexec "${self:?}" Invoke-Container \
    "${self:?}" --Initialize-ServerEnvironment \
    ##
}

go---Initialize-ServerEnvironment() {
    pexec "${server_environment:?}/bin/pip" \
        install \
        --editable \
        "${root:?}[server]" \
    ##
}

go-Invoke-ServerEnvironment() {
    pexec "${self:?}" Invoke-Container \
    "${self:?}" --Invoke-ServerEnvironment \
        "$@" \
    ##
}

go---Invoke-ServerEnvironment() {
    source "${server_environment:?}/bin/activate" \
    && \
    pexec "$@" \
    ##
}

park_server_name=${project,,}--park-server
unset park_server_bind
unset park_server_port

go-Start-ParkServer() {
    pexec tmux new-session \
        -A \
        -s "${park_server_name:?}" \
        "${self:?}" --Start-ParkServer \
    ##
}

go---Start-ParkServer() {
    pexec "${self:?}" Invoke-ParkServer \
    ##
}

go-Invoke-ParkServer() {
    pexec "${self:?}" Invoke-ServerEnvironment \
    "${self:?}" --Invoke-ParkServer \
    ##
}

go---Invoke-ParkServer() {
    PYTHONPATH=${root:?}/src${PYTHONPATH:+:${PYTHONPATH:?}} \
    SUNRISE_SCENE_PATH=${root:?}/data \
    SUNRISE_SERVER_BIND=${park_server_bind:?} \
    SUNRISE_SERVER_PORT=${park_server_port:?} \
    pexec python -m \
        sunrise.server \
    ##
}

city_server_name=${project,,}--city-server
unset city_server_bind
unset city_server_port

go-Start-CityServer() {
    pexec tmux new-session \
        -A \
        -s "${city_server_name:?}" \
        "${self:?}" --Start-CityServer \
    ##
}

go---Start-CityServer() {
    pexec "${self:?}" Invoke-CityServer \
    ##
}

go-Invoke-CityServer() {
    pexec "${self:?}" Invoke-ServerEnvironment \
    "${self:?}" --Invoke-CityServer \
    ##
}

go---Invoke-CityServer() {
    PYTHONPATH=${root:?}/src${PYTHONPATH:+:${PYTHONPATH:?}} \
    SUNRISE_SCENE_PATH=${root:?}/data \
    SUNRISE_SERVER_BIND=${city_server_bind:?} \
    SUNRISE_SERVER_PORT=${city_server_port:?} \
    pexec python -m \
        city.server \
    ##
}

client_root=${root:?}/src/sunrise-solid
client_name=${project,,}--client
unset client_bind
unset client_port

go-Initialize-ClientEnvironment() {
    cd "${client_root:?}" \
    && \
    pexec npm install \
    ##
}

go-Invoke-ClientEnvironment() {
    cd "${client_root:?}" \
    && \
    pexec "$@" \
    ##
}

go-Start-Client() {
    pexec tmux new-session \
        -A \
        -s "${client_name:?}" \
        "${self:?}" Invoke-Client \
    ##
}

go-Invoke-Client() {
    pexec "${self:?}" Invoke-ClientEnvironment \
    "${self:?}" --Invoke-Client \
    ##
}

go---Invoke-Client() {
    VITE_SUNRISE_PARK_SERVER_HOST=${park_server_host:?} \
    VITE_SUNRISE_CITY_SERVER_HOST=${city_server_host:?} \
    pexec npx vite \
        --host="${client_bind:?}" \
        --port="${client_port:?}" \
        --strictPort \
    ##
}

#---
test -f "${root:?}/env.sh" && source "${_:?}"
"go-$@"
