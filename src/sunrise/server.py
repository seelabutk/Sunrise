"""

"""

from __future__ import annotations
from ._auto import auto
from . import scene
from . import model


app = auto.fastapi.FastAPI(
)


# templates
templates = auto.fastapi.templating.Jinja2Templates(
    directory=(
        auto.pathlib.Path(__file__).parent / 'templates'
    ),
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


SUNRISE_LIBOSPRAY_PATH = auto.os.environ.get('SUNRISE_LIBOSPRAY_PATH', 'libospray.so')
SUNRISE_SCENE_PATH = auto.os.environ['SUNRISE_SCENE_PATH']


@auto.functools.cache
def get_scenes():
    global lib
    try:
        lib
    except NameError:
        lib = scene.load_library(SUNRISE_LIBOSPRAY_PATH)

        # argc = auto.ctypes.c_int(3)
        # argv0 = auto.ctypes.c_char_p(b'sunrise')
        # argv1 = auto.ctypes.c_char_p(b'--osp:load-modules=gpu')
        # argv2 = auto.ctypes.c_char_p(b'--osp:device=gpu')
        # argv = (auto.ctypes.c_char_p * 3)()
        # argv[0] = argv0
        # argv[1] = argv1
        # argv[2] = argv2
        # lib.ospInit(auto.ctypes.byref(argc), argv)

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

        for _ in range(1):
            scene_ = scene.Scene(
                what=what,
            )
            scene_.make()

            scenes.put_nowait(scene_)

    return scenes
_ = get_scenes()


# @auto.functools.cache
async def get_scene() -> auto.typing.Generator[scene.Scene, None, None]:
    scenes = get_scenes()

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

    scene: 
        scene.Scene
        =
        auto.fastapi.Depends(get_scene),

    tile: 
        str
        =
        auto.fastapi.Query(
            alias='tile',
        ),

    position: 
        str
        =
        auto.fastapi.Query(
            alias='position',
        ),
    direction: 
        str
        =
        auto.fastapi.Query(
            alias='direction',
        ),
    up: 
        str
        =
        auto.fastapi.Query(
            alias='up',
        ),

    width: 
        int
        =
        auto.fastapi.Query(
            alias='width',
        ),
    height: 
        int
        =
        auto.fastapi.Query(
            alias='height',
        ),

    samples: 
        int
        =
        auto.fastapi.Query(
            alias='samples',
        ),
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
