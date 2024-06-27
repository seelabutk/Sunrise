"""

"""

from __future__ import annotations
from ._auto import auto
from . import scene
from . import model
from . import config as conf
import json
import asyncio
import structlog
import logging
import logging.config

def configure_logger(logfile: str, enable_json_logs: bool = False):
    # Log to just a file
    logging.basicConfig(filename=logfile, encoding="utf-8", level=logging.DEBUG)

    # Uncomment below for logging to both file and stdout at runtime
#    logging.config.dictConfig({
#        "version": 1,
#        "disable_existing_loggers": False,
#        "handlers": {
#            "default": {
#                "level": "DEBUG",
#                "class": "logging.StreamHandler",
#            },
#            "file": {
#                "level": "DEBUG",
#                "class": "logging.handlers.WatchedFileHandler",
#                "filename": "test.log",
#            },
#        },
#        "loggers": {
#            "": {
#                "handlers": ["default", "file"],
#                "level": "DEBUG",
#                "propagate": True,
#            },
#        }
#    })
    timestamper = structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S")

    shared_processors = [
        timestamper,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.contextvars.merge_contextvars,
        structlog.processors.CallsiteParameterAdder(
            {
                structlog.processors.CallsiteParameter.PATHNAME,
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.MODULE,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.THREAD,
                structlog.processors.CallsiteParameter.THREAD_NAME,
                structlog.processors.CallsiteParameter.PROCESS,
                structlog.processors.CallsiteParameter.PROCESS_NAME,
            }
        ),
        structlog.stdlib.ExtraAdder(),
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        # call log with await syntax in thread pool executor
        # wrapper_class=structlog.stdlib.AsyncBoundLogger,
        cache_logger_on_first_use=True,
    )

    logs_render = (
        structlog.processors.JSONRenderer()
        if enable_json_logs
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    _configure_default_logging_by_custom(shared_processors, logs_render)

def _configure_default_logging_by_custom(shared_processors, logs_render):
    handler = logging.StreamHandler()

    # Use `ProcessorFormatter` to format all `logging` entries.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            _extract_from_record,
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            logs_render,
        ],
    )

    handler.setFormatter(formatter)
    root_uvicorn_logger = logging.getLogger()
    root_uvicorn_logger.addHandler(handler)
    root_uvicorn_logger.setLevel(logging.INFO)


def _extract_from_record(_, __, event_dict):
    # Extract thread and process names and add them to the event dict.
    record = event_dict["_record"]
    event_dict["thread_name"] = record.threadName
    event_dict["process_name"] = record.processName
    return event_dict

# configure_logger()

custom_logger = structlog.get_logger("custom_logger")

app = auto.fastapi.FastAPI(
)


# static
app.mount(
    '/static',
    auto.fastapi.staticfiles.StaticFiles(
        directory=(
            auto.pathlib.Path(__file__).parent / 'static'
        ),
    ),
)

# Read the configuration from the "config.toml" file 
@auto.functools.cache
def get_config():
    with open("config.toml", "rb") as f:
        config = auto.tomli.load(f)
        con = conf.Config(config)
        return con

# Load the species relation matrix 
# for potential queries
@auto.functools.cache
def load_matrix():
    df = auto.pd.read_csv("species_matrix.csv")
    return df


# Run the fastapi server
async def run_server():
    config_info = get_config()
    configure_logger(config_info.server.logfile())
    custom_logger.debug('Server Started', whom='world')
    config = auto.uvicorn.Config("sunrise.server:app", port=config_info.server.port(), host=config_info.server.host())
    server = auto.uvicorn.Server(config)
    await server.serve()

# Main Function
if __name__ == "__main__":
    asyncio.run(run_server())

# templates
templates = auto.fastapi.templating.Jinja2Templates(
    directory=(
        auto.pathlib.Path(__file__).parent / 'templates'
    ),
)

SUNRISE_LIBOSPRAY_PATH = auto.os.environ.get('SUNRISE_LIBOSPRAY_PATH', 'libospray.so')
SUNRISE_SCENE_PATH = auto.os.environ['SUNRISE_SCENE_PATH']


# @auto.functools.cache
async def get_scene(
    config: auto.typing.Annotated[
        auto.typing.Any,
        auto.fastapi.Depends(get_config),
    ],
) -> auto.typing.Generator[scene.Scene, None, None]:
    global lib
    try:
        lib
    except NameError:
        lib = scene.load_library(SUNRISE_LIBOSPRAY_PATH)
        lib.ospInit(None, None)

        if len(config.renderer.modules) != 0:
            for module in config.renderer.modules:
                lib.ospLoadModule(module.encode())


        auto.atexit.register(lib.ospShutdown)
    
    global scenes
    try:
        scenes
    except NameError:
        scenes = auto.asyncio.Queue()
#        what = scene.Park(
#            path=auto.pathlib.Path('data'),
#        )
#        what.make()

        for _ in range(6):
            what = scene.Park(
                path=auto.pathlib.Path('data'),
            )
            what.make()
            scene_ = scene.Scene(
                what=what,
            )
            scene_.configure(config)
            scene_.make()

            scenes.put_nowait(scene_)
    
    scene_ = None
    try:
        scene_ = await scenes.get()
        yield scene_

    finally:
        if scene_ is not None:
            scenes.put_nowait(scene_)


@app.get('/')
async def index(
    *,
    request: auto.fastapi.Request,
):
    return templates.TemplateResponse(
        'index.html.template',
        dict(
            request=request,
        ),
    )

# API Route to get the 10 most relevant
# species for the one specifies
@app.get('/api/reccomendation')
async def reccomendation(
    *,
    species_matrix: auto.typing.Annotated[
        auto.typing.Any,
        auto.fastapi.Depends(load_matrix),
    ],
    species_id: auto.typing.Annotated[
        int,
        auto.fastapi.Query(
            alias='irma_id',
        ),
    ],
):
    # sanitized_id = [int(i) for i in species_id.split() if i.isdigit()]
    
    # Take the top ten species for the 
    # slist = species_matrix.groupby('Species').first()
    # slist = slist.loc
    # top_related_species = species_matrix.groupby('Species').first().loc[29846].sort_values(ascending=False)[:10]
    top_related_species = species_matrix.groupby('Species').first().loc[species_id].sort_values(ascending=False)[:10]
    recc_obj = json.dumps({ "related_species": top_related_species.tolist() })
    # print(top_related_species)

    return auto.fastapi.Response(
            # content="Hello",
            # media_type="text/plain",
        content=recc_obj,
        media_type='application/json'
    )
    

@app.get('/api/config')
async def config(
    config: auto.typing.Annotated[
        auto.typing.Any,
        auto.fastapi.Depends(get_config),
    ],
):
    return auto.fastapi.Response(
        content=config.client_data_response(),
        media_type='application/json'
    )


@app.get('/api/v1/view/')
async def view(
    *,

    scene: auto.typing.Annotated[
        scene.Scene,
        auto.fastapi.Depends(get_scene),
    ],

    tile: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='tile',
        ),
    ],

    position: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='position',
        ),
    ],
    direction: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='direction',
        ),
    ],
    up: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='up',
        ),
    ],

    width: auto.typing.Annotated[
        int,
        auto.fastapi.Query(
            alias='width',
        ),
    ],
    height: auto.typing.Annotated[
        int | None,
        auto.fastapi.Query(
            alias='height',
        ),
    ],

    samples: auto.typing.Annotated[
        int,
        auto.fastapi.Query(
            alias='samples',
        ),
    ],
    
    hour: auto.typing.Annotated[
        float,
        auto.fastapi.Query(
            alias='hour',
        ),
    ],
    
    light: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='light',
        ),
    ],
    
    observation: auto.typing.Annotated[
        str,
        auto.fastapi.Query(
            alias='observation',
        ),
    ],
):
    tile = tuple(map(str, tile.split(',')))
    position = tuple(map(float, position.split(',')))
    direction = tuple(map(float, direction.split(',')))
    up = tuple(map(float, up.split(',')))

    response = await scene.arender(model.RenderingRequest(
        width=width,
        height=height,
        tile=tile,
        position=position,
        direction=direction,
        up=up,
        samples=samples,
        hour=hour,
        light=light,
        observation=observation
    ), custom_logger)
    
    with auto.io.BytesIO() as f:
        response.image.save(f, 'PNG')

        return auto.fastapi.Response(
            content=f.getvalue(),
            media_type='image/png',
        )

