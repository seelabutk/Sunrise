case "${HOSTNAME:-unset}" in (accona|sinai|kavir|gobi|thar|sahara)

docker_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=false"
    --net=host
)

docker_service_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=true"
)

;; esac


if [ "${USER:-}" = "thobson2" ]; then
    server_bind=127.242.160.24  # $(,address sunrise +%B)
    server_port=57872  # $(,address sunrise +%P)
fi
