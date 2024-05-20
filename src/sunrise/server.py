"""

"""

from __future__ import annotations
from ._auto import auto
from . import scene
from . import model
from . import config as conf
import asyncio

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
async def read_config():
    with open("config.toml", "rb") as f:
        config = auto.tomli.load(f)
        print(config)
        con = conf.Config(config)
        return con

async def run_server():
    config_info = await read_config()
    config = auto.uvicorn.Config("sunrise.server:app", port=config_info.server.port(), host=config_info.server.host())
    server = auto.uvicorn.Server(config)
    await server.serve()

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
async def get_scene() -> auto.typing.Generator[scene.Scene, None, None]:
    global lib
    try:
        lib
    except NameError:
        lib = scene.load_library(SUNRISE_LIBOSPRAY_PATH)
        lib.ospInit(None, None)

        auto.atexit.register(lib.ospShutdown)
    
    global scenes
    try:
        scenes
    except NameError:
        scenes = auto.asyncio.Queue()

        what = scene.Park(
            path=auto.pathlib.Path('data'),
        )
        what.make()

        config = await read_config()

        for _ in range(6):
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
):
    tile = tuple(map(float, tile.split(',')))
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
    ))
    
    with auto.io.BytesIO() as f:
        response.image.save(f, 'PNG')

        return auto.fastapi.Response(
            content=f.getvalue(),
            media_type='image/png',
        )

