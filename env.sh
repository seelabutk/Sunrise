case "${HOSTNAME:-unset}" in (accona|sinai|kavir|gobi|thar|sahara)
echo "CASE MET"
docker_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=false"
    # --publish=127.202.208.70:33267:33267
    --net=host
)

docker_service_start+=(
    --mount="type=bind,src=/mnt/seenas2/data,dst=/mnt/seenas2/data,readonly=true"
)

;; esac

GLOBE_PROD_PORT=33267
GLOBE_PROD_IP=127.202.208.70


#if [ "${USER:-}" = "raustin9" ]; then
#    # echo "User: ${USER:-}"
#    server_bind=${GLOBE_PROD_IP}
#    server_port=${GLOBE_PROD_PORT}
#    # server_bind=127.242.160.24  # $(,address sunrise +%B)
#    # server_port=57872  # $(,address sunrise +%P)
#fi
if [ "${USER:-}" = "thobson2" ]; then
    server_bind=127.242.160.24  # $(,address sunrise +%B)
    server_port=57872  # $(,address sunrise +%P)
fi
