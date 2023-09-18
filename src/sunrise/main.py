#!/usr/bin/env python3
"""

"""

from __future__ import annotations

import functools
import ctypes
import dataclasses
import math
import datetime
import pathlib
import struct
import contextlib
import typing
import itertools

import skyfield, skyfield.api, skyfield.toposlib
import numpy as np
import ospray
import PIL.Image


lib: ctypes.CDLL = None


def not_implemented(*args, **kwargs):
    raise NotImplementedError()


def dispatch(default_func: callable, /):
    @functools.wraps(default_func)
    def wrapper(*args, **kwargs):
        if args:
            return dispatch(*args, **kwargs)
        
        return default_func(*args, **kwargs)
    
    dispatch = functools.singledispatchmethod(wrapper)
    wrapper.register = dispatch.register
    return wrapper


@dataclasses.dataclass
class Location:
    lat: float
    lng: float
    alt: float

    from_ = functools.singledispatchmethod(not_implemented)


@dataclasses.dataclass
class Position:
    x: float
    y: float
    z: float

    from_ = functools.singledispatchmethod(not_implemented)


@Location.from_.register(str)
def __location_from_name(
    cls,
    name: str,
    /,
    alt: float,
    latlngs={
        "Clingman's Dome": (35.562929, -83.497560),
    },
):
    lat, lng = latlngs[name]
    return cls(
        lat=lat,
        lng=lng,
        alt=alt,
    )


@Position.from_.register(Location)
def __position_from_location(
    cls,
    loc: Location,
    /,
    *,
    math=math,
):
    # Thanks https://gis.stackexchange.com/a/4148
    
    #> Note that "Lat/Lon/Alt" is just another name for spherical coordinates, and 
    #> phi/theta/rho are just another name for latitude, longitude, and altitude.
    #> :) (A minor difference: altitude is usually measured from the surface of the 
    #> sphere; rho is measured from the center -- to convert, just add/subtract the 
    #> radius of the sphere.)
    phi: Radian = math.radians(loc.lat)
    theta: Radian = math.radians(loc.lng)
    
    # Thanks https://en.wikipedia.org/wiki/Earth_radius
    #> A globally-average value is usually considered to be 6,371 kilometres (3,959 mi)
    rho: Meter = 6_371 + loc.alt
    
    #> x = math.cos(phi) * math.cos(theta) * rho
    x: Meter = math.cos(phi) * math.cos(theta) * rho
    
    #> y = math.cos(phi) * math.sin(theta) * rho
    y: Meter = math.cos(phi) * math.sin(theta) * rho

    #> z = math.sin(phi) * rho # z is 'up'
    z: Meter = math.sin(phi) * rho
    
    #> (Note there's some slightly arbitrary choices here in what each axis means...
    #> you might want 'y' to point at the north pole instead of 'z', for example.)
    
    # I do :)
    y, z = z, y
    
    return cls(
        x=x,
        y=y,
        z=z,
    )


@Location.from_.register(datetime.datetime)
def __location_from_datetime(
    cls,
    when: datetime.datetime,
    /,
    *,
    alt: float,
    planets=skyfield.api.load('de421.bsp'),
    timescale=skyfield.api.load.timescale(),
):
    sun = planets['sun']
    earth = planets['earth']

    now = timescale.from_datetime(when)

    position = earth.at(now).observe(sun).apparent()

    location = skyfield.toposlib.wgs84.geographic_position_of(position)
    lat = location.latitude.degrees
    lng = location.longitude.degrees

    return cls(
        lat=lat,
        lng=lng,
        alt=alt,
    )


def Read(path: pathlib.Path, /, *, dtype: np.DType) -> np.NDArray:
    with open(path, 'rb') as f:
        def Read(fmt: str, /) -> tuple:
            size = struct.calcsize(fmt)
            data = f.read(size)
            assert len(data) == size
            return struct.unpack(fmt, data)
        
        N ,= Read('I')
        shape = Read(f'{N}I')
        # print(f'Reading {shape=!r} from {path=!r}')
        data = np.fromfile(f, dtype=dtype)

    data = data.reshape(shape)
    return data



def Data(array: np.ndarray, /, *, type: lib.OSPDataType) -> lib.OSPData:
    if isinstance(array, list):
        for i, x in enumerate(array):
            if not isinstance(x, lib.OSPObject):
                break
            
        else:
            array = (ctypes.cast(x, ctypes.c_void_p).value for x in array)
            array = np.fromiter(array, dtype=np.uintp)
            return Data(array, type=type)
    
        array = np.asarray(array)
        return Data(array, type=type)
    
    if len(array.shape) == 0:
        array = array[None, None, None]

    elif len(array.shape) == 1:
        array = array[:, None, None]

    elif len(array.shape) == 2:
        array = array[:, :, None]
        
    elif len(array.shape) == 3:
        array = array[:, :, :]

    else:
        raise NotImplementedError()

    src = lib.ospNewSharedData(
        array.ctypes.data, type,
        array.shape[0], array.strides[0],
        array.shape[1], array.strides[1],
        array.shape[2], array.strides[2],
    )
    lib.ospCommit(src)

    dst = lib.ospNewData(type, *array.shape)
    lib.ospCopyData(src, dst, 0, 0, 0)
    lib.ospCommit(dst)

    lib.ospRelease(src)
    return dst


@dataclasses.dataclass
class RenderingRequest:
    width: int
    height: int
    hour: int
    position: tuple[float, float, float]
    up: tuple[float, float, float]
    direction: tuple[float, float, float]


@dataclasses.dataclass
class RenderingResponse:
   image: PIL.Image


def with_exit_stack(func: callable, /):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with contextlib.ExitStack() as stack:
            return func(*args, stack=stack, **kwargs)
    
    return wrapper


def with_commit(func: callable, /):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        lib.ospCommit(ret)
        return ret
    return wrapper

def with_release(func: callable, /):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        defer(lib.ospRelease, ret)
        return ret
    return wrapper

def with_factory(func: callable, *args, **kwargs):
    factory = functools.partial(func, *args, **kwargs)

    def with_call(func: callable, /):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(factory(), *args, **kwargs)
        return wrapper
    return with_call


def Render(
    *,
    path: pathlib.Path,
    stack: contextlib.ExitStack,
) -> typing.Generator[RenderingResponse, RenderingRequest, None]:
    close = contextlib.closing
    enter = stack.enter_context
    defer = stack.callback

    # def defer(func, *args, **kwargs):
    #     caller = inspect.getframeinfo(inspect.stack()[1][0])
    #     filename = caller.filename
    #     lineno = caller.lineno

    #     print(f'{filename}:{lineno}: Deferring {func.__name__}', flush=True, file=sys.stderr)

    #     def wrapper():
    #         print(f'{filename}:{lineno}: Executing {func.__name__}', flush=True, file=sys.stderr)
    #         func(*args, **kwargs)
    #     
    #     stack.callback(wrapper)

    def Terrain(
        *,
        path: pathlib.Path,
    ) -> lib.OSPGeometry:
        position = path / 'OSPGeometry.mesh.vertex.position.vec3f.bin'
        position = Read(position, dtype=[ ('x', 'f4'), ('y', 'f4'), ('z', 'f4') ])
        position = Data(position, type=lib.OSP_VEC3F)
        defer(lib.ospRelease, position)

        texcoord = path / 'OSPGeometry.mesh.vertex.texcoord.vec2f.bin'
        texcoord = Read(texcoord, dtype=[ ('u', 'f4'), ('v', 'f4') ])
        texcoord = Data(texcoord, type=lib.OSP_VEC2F)
        defer(lib.ospRelease, texcoord)

        normal = path / 'OSPGeometry.mesh.vertex.normal.vec3f.bin'
        normal = Read(normal, dtype=[ ('x', 'f4'), ('y', 'f4'), ('z', 'f4') ])
        normal = Data(normal, type=lib.OSP_VEC3F)
        defer(lib.ospRelease, normal)

        index = path / 'OSPGeometry.mesh.index.vec4ui.bin'
        index = Read(index, dtype=[ ('a', 'u4'), ('b', 'u4'), ('c', 'u4'), ('d', 'u4') ])
        index = Data(index, type=lib.OSP_VEC4UI)
        defer(lib.ospRelease, index)

        geometry = lib.ospNewGeometry(b'mesh')
        defer(lib.ospRelease, geometry)
        lib.ospSetObject(geometry, b'vertex.position', position)
        lib.ospSetObject(geometry, b'vertex.texcoord', texcoord)
        lib.ospSetObject(geometry, b'vertex.normal', normal)
        lib.ospSetObject(geometry, b'index', index)
        lib.ospCommit(geometry)

        return geometry

    def Colormap(
        *,
        path: pathlib.Path,
    ) -> lib.OSPMaterial:
        data = path / 'OSPTexture.texture2d.data.vec3f.bin'
        data = Read(data, dtype=[ ('r', 'f4'), ('g', 'f4'), ('b', 'f4') ])
        data = Data(data, type=lib.OSP_VEC3F)
        defer(lib.ospRelease, data)

        texture = lib.ospNewTexture(b'texture2d')
        defer(lib.ospRelease, texture)
        lib.ospSetObject(texture, b'data', data)
        lib.ospSetInt(texture, b'format', lib.OSP_TEXTURE_RGB32F)
        lib.ospCommit(texture)

        material = lib.ospNewMaterial(None, b'obj')
        defer(lib.ospRelease, material)
        lib.ospSetObject(material, b'map_kd', texture)
        lib.ospSetVec3f(material, b'ks', 1.0, 1.0, 1.0)
        lib.ospSetFloat(material, b'ns', 2.0)
        lib.ospCommit(material)

        return material
    
    def Observation(
        *,
        path: pathlib.Path,
    ) -> lib.OSPData:
        index = path / 'OSPGeometricModel.index.vec1uc.bin'
        index = Read(index, dtype='u1')
        index = Data(index, type=lib.OSP_UCHAR)
        defer(lib.ospRelease, index)

        return index

    def Park(
        *,
        terrain: lib.OSPGeometry,
        colormaps: list[lib.OSPMaterial],
        observation: lib.OSPData,
    ) -> lib.OSPGroup:
        colormaps = Data(colormaps, type=lib.OSP_MATERIAL)
        defer(lib.ospRelease, colormaps)

        geometric_models = []

        geometric_models.append(
            (model := lib.ospNewGeometricModel(None)),
        )
        defer(lib.ospRelease, model)
        lib.ospSetObject(model, b'geometry', terrain)
        lib.ospSetObject(model, b'material', colormaps)
        lib.ospSetObject(model, b'index', observation)
        lib.ospCommit(model)

        geometric_models = Data(geometric_models, type=lib.OSP_GEOMETRIC_MODEL)
        defer(lib.ospRelease, geometric_models)

        groups = []

        groups.append(
            (group := lib.ospNewGroup()),
        )
        defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'geometry', geometric_models)
        lib.ospCommit(group)

        groups = Data(groups, type=lib.OSP_GROUP)
        defer(lib.ospRelease, groups)
        lib.ospCommit(groups)

        instance = lib.ospNewInstance(None)
        defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        return instance

    def Sun(
        *,
        now: datetime.datetime,
    ) -> lib.OSPGroup:
        loc = __location_from_datetime(Location, now, alt=10_000.0)
        pos = __position_from_location(Position, loc)

        lights = []

        lights.append(
            (light := lib.ospNewLight(b'distant')),
        )
        defer(lib.ospRelease, light)
        lib.ospSetVec3f(light, b'position', pos.x, pos.y, pos.z)
        lib.ospSetVec3f(light, b'direction', -pos.x, -pos.y, -pos.z)
        lib.ospSetFloat(light, b'intensity', 1.8)
        lib.ospCommit(light)

        lights = Data(lights, type=lib.OSP_LIGHT)
        defer(lib.ospRelease, lights)
        lib.ospCommit(lights)

        groups = []
        groups.append(
            (group := lib.ospNewGroup()),
        )
        defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'light', lights)
        lib.ospCommit(group)

        groups = Data(groups, type=lib.OSP_GROUP)
        defer(lib.ospRelease, groups)
        lib.ospCommit(groups)

        instance = lib.ospNewInstance(None)
        defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        return instance

    instances = []

    instances.append(
        (park := Park(
            terrain=Terrain(path=path / 'park'),
            colormaps=[
                Colormap(path=path / 'pink0'),
                Colormap(path=path / 'pink1'),
                Colormap(path=path / 'pink2'),
                Colormap(path=path / 'pink3'),
            ],
            observation=Observation(path=path / 'observation'),
        )),
    )

    sun_index = len(instances)
    instances.append(
        (sun := Sun(
            now=datetime.datetime(year=2023, month=6, day=1, hour=12, tzinfo=datetime.timezone(
                offset=datetime.timedelta(hours=-5),
                name='EST',
            )),
        )),
    )

    instances = Data(instances, type=lib.OSP_INSTANCE)
    defer(lib.ospRelease, instances)
    lib.ospCommit(instances)

    world = lib.ospNewWorld()
    defer(lib.ospRelease, world)
    lib.ospSetObject(world, b'instance', instances)
    lib.ospCommit(world)

    renderer = lib.ospNewRenderer(b'pathtracer')
    defer(lib.ospRelease, renderer)
    lib.ospSetInt(renderer, b'pixelSamples', 32)
    lib.ospCommit(renderer)
    
    camera = lib.ospNewCamera(
        (
            b'panoramic'
            # b'orthographic'
        ),
    )
    defer(lib.ospRelease, camera)
    lib.ospSetInt(camera, b'architectural', 1)
    # lib.ospSetFloat(camera, b'height', 100.0)
    lib.ospSetVec4f(camera, b'backgroundColor', *(
        0.0, 0.0, 0.0, 0.0,
    ))
    lib.ospCommit(camera)

    response = None
    while True:
        request = yield response

        lib.ospSetVec3f(camera, b'position', *request.position)
        lib.ospSetVec3f(camera, b'up', *request.up)
        lib.ospSetVec3f(camera, b'direction', *request.direction)
        lib.ospCommit(camera)

        instances = []
        instances.append(
            park,
        )

        instances.append(
            (sun := Sun(
                now=(
                    datetime.datetime(year=2023, month=6, day=1, hour=0, tzinfo=datetime.timezone(
                        offset=datetime.timedelta(hours=-5),
                        name='EST',
                    ))
                    +
                    datetime.timedelta(hours=request.hour)
                ),
            )),
        )

        instances = Data(instances, type=lib.OSP_INSTANCE)
        defer(lib.ospRelease, instances)
        lib.ospCommit(instances)

        lib.ospSetObject(world, b'instance', instances)
        lib.ospCommit(world)

        width = request.width
        height = request.height

        framebuffer = lib.ospNewFrameBuffer(
            width,
            height,
            lib.OSP_FB_RGBA8,
            lib.OSP_FB_COLOR,
        )

        _variance: float = lib.ospRenderFrameBlocking(
            framebuffer,
            renderer,
            camera,
            world,
        )

        rgba = lib.ospMapFrameBuffer(framebuffer, lib.OSP_FB_COLOR)
        image = PIL.Image.frombytes(
            'RGBA',
            (width, height),
            ctypes.string_at(rgba, size=(width * height * 4)),
            'raw',
            'RGBA',
            0,
            -1,  # flip y
        )
        image.load()

        lib.ospUnmapFrameBuffer(rgba, framebuffer)

        lib.ospRelease(framebuffer)

        response = RenderingResponse(
            image=image,
        )


@with_exit_stack
def main(*, stack):
    global lib
    lib = ospray.load_library('libospray.so')

    lib.ospInit(None, None)
    stack.callback(lib.ospShutdown)

    render = Render(
        path=pathlib.Path.cwd() / 'data',
        stack=stack.enter_context(contextlib.ExitStack()),
    )
    next(render)

    pos = Position(563.2271446178601, 3706.84551063691, -5153.367883611318)

    # loc = __location_from_name(Location, "Clingman's Dome", alt=2_000.0)
    # pos = __position_from_location(Position, loc)

    for i, hour in enumerate(itertools.chain(
        [0, 2, 4],
        [6, 7, 8],
        [9, 9.5, 10, 10.5, 11, 11.5],
        [12],
        [12.5, 13, 13.5, 14, 14.5],
        [15, 16, 17],
        [18, 20, 22],
    )):
        request = RenderingRequest(
            width=1024,
            height=512,
            hour=hour,
            position=(
                pos.x, pos.y, pos.z,
            ),
            up=(
                pos.x, pos.y, pos.z,
            ),
            direction=(
                3.3002321090438045, 0.29997060238702034, 1.1959763137756454
                # -pos.x, -pos.y, -pos.z,
            ),
        )
        
        response = render.send(request)

        response.image.save(
            (path := f'tmp/out-{i:02d}.png'),
            format='PNG',
        )
        print(f'Wrote to {path}')


def cli():
    import argparse

    parser = argparse.ArgumentParser()
    args = vars(parser.parse_args())

    main(**args)


if __name__ == '__main__':
    cli()