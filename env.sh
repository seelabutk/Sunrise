case "${HOSTNAME:-unset}" in (accona|sinai|kavir|gobi|thar|sahara)

docker_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=false"
    --net=host
)

docker_service_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=true"
)

;; esac