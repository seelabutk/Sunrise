"""

"""

from __future__ import annotations

import sunrise.util, sunrise.model

import contextlib
import ctypes
import dataclasses
import datetime
import functools
import itertools
import math
import pathlib
import struct
import typing

import numpy as np
import ospray
import PIL.Image
import skyfield, skyfield.api, skyfield.toposlib


__all__ = [
    'lib',
    'load_library',
    'Render',
]


lib: ctypes.CDLL = None


@functools.wraps(ospray.load_library)
def load_library(*args, **kwargs) -> ctypes.CDLL:
    global lib
    if lib is not None:
        return lib
    
    lib = ospray.load_library(*args, **kwargs)
    return lib


def Read(
    path: pathlib.Path,
    /,
    *,
    dtype: np.DType,
) -> np.NDArray:
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



def Data(
    array: np.ndarray,
    /,
    *,
    type: lib.OSPDataType,
) -> lib.OSPData:
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


def with_exit_stack(func: callable, /):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with contextlib.ExitStack() as stack:
            return func(*args, stack=stack, **kwargs)
    
    return wrapper


def Render(
    *,
    path: pathlib.Path,
    stack: contextlib.ExitStack=None,
) -> typing.Generator[
    sunrise.model.RenderingResponse,
    sunrise.model.RenderingRequest,
    None,
]:
    if stack is None:
        with contextlib.ExitStack() as stack:
            yield from Render(
                path=path,
                stack=stack,
            )
        return

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
        loc = sunrise.model.location_from_datetime(now, alt=10_000.0)
        pos = sunrise.model.position_from_location(loc)

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

        response = sunrise.model.RenderingResponse(
            image=image,
        )