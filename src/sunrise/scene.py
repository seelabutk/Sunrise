"""

"""

from __future__ import annotations

from ._auto import auto
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
import time

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
    print(f'trying to open {path}: ', end='')
    with open(path, 'rb') as f:
        def Read(fmt: str, /) -> tuple:
            size = struct.calcsize(fmt)
            data = f.read(size)
            assert len(data) == size
            return struct.unpack(fmt, data)
        
        N ,= Read('I')
        shape = Read(f'{N}I')
        # print(f'Reading {shape=!r} from {path=!r}')
        # data = np.fromfile(f, dtype=dtype)
        data = np.memmap(f, dtype=dtype, shape=shape, mode='r', offset=f.tell())

    data = data.reshape(shape)
    print('success')
    return data



def Data(
    array: np.ndarray,
    /,
    *,
    type: lib.OSPDataType,
    share: bool=False,
) -> lib.OSPData:
    # print("DATA 1")
    if isinstance(array, list):
        for i, x in enumerate(array):
            if not isinstance(x, lib.OSPObject):
                break
            
        else:
            array = (ctypes.cast(x, ctypes.c_void_p).value for x in array)
            assert(array != None)
            array = np.fromiter(array, dtype=np.uintp)
            return Data(array, type=type)
    
        array = np.asarray(array)
        return Data(array, type=type)
    
    # print("DATA 2")
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
    # print("DATA 3")

    src = lib.ospNewSharedData(
        array.ctypes.data, type,
        array.shape[0], array.strides[0],
        array.shape[1], array.strides[1],
        array.shape[2], array.strides[2],
        None, None
    )
    lib.ospCommit(src)
    # print(f"DATA 4: type: {type}")
    if share:
        return src

    dst = lib.ospNewData(type, *array.shape)
    lib.ospCopyData(src, dst, 0, 0, 0)
    lib.ospCommit(dst)
    # print("DATA 5")

    lib.ospRelease(src)
    # print("DATA 6")
    return dst


def with_exit_stack(func: callable, /):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with contextlib.ExitStack() as stack:
            return func(*args, stack=stack, **kwargs)
    
    return wrapper


class WithExitStackMixin:
    def __init__(self):
        self._stack = auto.contextlib.ExitStack()
    
    def __enter__(self):
        self.make()
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
    
    def close(self):
        self._stack.close()
    
    def hold(self, what):
        return self.defer(id, what)
    
    def defer(self, callback, *args, **kwargs):
        self._stack.callback(callback, *args, **kwargs)
    
    def enter(self, other):
        return self._stack.enter_context(other)


class Terrain(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        position = self.path / 'OSPGeometry.mesh.vertex.position.vec3f.bin'
        position = Read(position, dtype=[ ('x', 'f4'), ('y', 'f4'), ('z', 'f4') ])

        xlo = position['x'].min()
        xhi = position['x'].max()
        xmi = (xlo + xhi) / 2
        ylo = position['y'].min()
        yhi = position['y'].max()
        ymi = (ylo + yhi) / 2
        zlo = position['z'].min()
        zhi = position['z'].max()
        zmi = (zlo + zhi) / 2

        print(self.path)
        print(f'[ {xlo:.1f} ]-[ {xmi:.1f} ]-[ {xhi:.1f} ] ({position["x"][0]:.1f})')
        print(f'[ {ylo:.1f} ]-[ {ymi:.1f} ]-[ {yhi:.1f} ] ({position["y"][0]:.1f})')
        print(f'[ {zlo:.1f} ]-[ {zmi:.1f} ]-[ {zhi:.1f} ] ({position["z"][0]:.1f})')

        self.hold(position)
        position = Data(position, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, position)

        texcoord = self.path / 'OSPGeometry.mesh.vertex.texcoord.vec2f.bin'
        texcoord = Read(texcoord, dtype=[ ('u', 'f4'), ('v', 'f4') ])
        self.hold(texcoord)
        texcoord = Data(texcoord, type=lib.OSP_VEC2F, share=True)
        self.defer(lib.ospRelease, texcoord)

        normal = self.path / 'OSPGeometry.mesh.vertex.normal.vec3f.bin'
        normal = Read(normal, dtype=[ ('x', 'f4'), ('y', 'f4'), ('z', 'f4') ])
        self.hold(normal)
        normal = Data(normal, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, normal)

        index = self.path / 'OSPGeometry.mesh.index.vec4ui.bin'
        index = Read(index, dtype=[ ('a', 'u4'), ('b', 'u4'), ('c', 'u4'), ('d', 'u4') ])
        self.hold(index)
        index = Data(index, type=lib.OSP_VEC4UI, share=True)
        self.defer(lib.ospRelease, index)

        geometry = lib.ospNewGeometry(b'mesh')
        self.defer(lib.ospRelease, geometry)
        lib.ospSetObject(geometry, b'vertex.position', position)
        lib.ospSetObject(geometry, b'vertex.texcoord', texcoord)
        lib.ospSetObject(geometry, b'vertex.normal', normal)
        lib.ospSetObject(geometry, b'index', index)
        lib.ospCommit(geometry)

        self.geometry = geometry


class Colormap(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        data = self.path / 'OSPTexture.texture2d.data.vec3f.bin'
        data = Read(data, dtype=[ ('r', 'f4'), ('g', 'f4'), ('b', 'f4') ])
        self.hold(data)
        data = Data(data, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, data)

        texture = lib.ospNewTexture(b'texture2d')
        self.defer(lib.ospRelease, texture)
        lib.ospSetObject(texture, b'data', data)
        lib.ospSetUInt(texture, b'format', lib.OSP_TEXTURE_RGB32F)
        lib.ospCommit(texture)

        material = lib.ospNewMaterial(b'obj')
        self.defer(lib.ospRelease, material)
        lib.ospSetObject(material, b'map_kd', texture)
        lib.ospSetFloat(material, b'ns', 1.0)
        lib.ospCommit(material)

        self.material = material
        self.defer(lib.ospRelease, material)
        lib.ospSetObject(material, b'map_kd', texture)
        lib.ospSetFloat(material, b'ns', 1.0)
        lib.ospCommit(material)

        self.material = material


class Observation(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        index = self.path / 'OSPGeometricModel.index.vec1uc.bin'
        index = Read(index, dtype='u1')
        self.hold(index)
        index = Data(index, type=lib.OSP_UCHAR, share=True)
        self.defer(lib.ospRelease, index)

        self.index = index


class Park(WithExitStackMixin):
    def __init__(
        self,
        terrain: Terrain,
        colormaps: list[Colormap],
        observation: Observation | None,
    ):
        super().__init__()

        self.terrain = terrain
        self.colormaps = colormaps
        self.observation = observation
    
    def make(self):
        colormaps = Data([
            colormap.material
            for colormap in self.colormaps
        ], type=lib.OSP_MATERIAL)
        self.defer(lib.ospRelease, colormaps)

        geomodel = lib.ospNewGeometricModel(None)
        self.defer(lib.ospRelease, geomodel)
        lib.ospSetObject(geomodel, b'geometry', self.terrain.geometry)
        lib.ospSetObject(geomodel, b'material', colormaps)
        if self.observation is not None:
            lib.ospSetObject(geomodel, b'index', self.observation.index)
        lib.ospCommit(geomodel)

        geomodels = Data([
            geomodel,
        ], type=lib.OSP_GEOMETRIC_MODEL)
        self.defer(lib.ospRelease, geomodels)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'geometry', geomodels)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        self.instance = instance


class Ambient(WithExitStackMixin):
    def __init__(self):
        super().__init__()
    
    def make(self):
        light = lib.ospNewLight(b'ambient')
        self.defer(lib.ospRelease, light)
        lib.ospSetFloat(light, b'intensity', 0.75)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospCommit(light)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        self.instance = instance


class Point(WithExitStackMixin):
    def __init__(self):
        super().__init__()

    def make(self):
        light = lib.ospNewLight(b'sphere')
        self.defer(lib.ospRelease, light)
        lib.ospSetFloat(light, b'intensity', 0.5)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospSetVec3f(light, b'direction', 0.0, 0.0, 0.0)
        lib.ospSetVec3f(light, b'position', 100000.0, 100000.0, 100000.0)
        lib.ospSetFloat(light, b'radius', 100000.0)
        lib.ospSetVec3f(light, b'color', 0.2, 0.5, 0.6)
        lib.ospCommit(light)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        self.instance = instance


class Distant(WithExitStackMixin):
    def __init__(self):
        super().__init__()

    def make(self):
        light = lib.ospNewLight(b'distant')
        self.defer(lib.ospRelease, light)
        lib.ospSetFloat(light, b'intensity', 0.75)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospSetVec3f(light, b'direction', 0.0, 1.0, 1.0)
        lib.ospCommit(light)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        self.instance = instance


class Sunlight(WithExitStackMixin):
    def __init__(self):
        super().__init__()

    def make(self):
        light = lib.ospNewLight(b'sunSky')
        self.defer(lib.ospRelease, light)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospSetVec3f(light, b'color', 0.8, 0.8, 0.8)
        lib.ospSetFloat(light, b'intensity', 1.0)
        lib.ospSetVec3f(light, b'direction', 0.0, 0.0, -1.0)
        lib.ospSetFloat(light, b'albedo', 0.5)
        lib.ospCommit(light)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)

        self.instance = instance


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

    # print("2")
    close = contextlib.closing
    enter = stack.enter_context
    defer = stack.callback
    hold = id

    instances = []

    park = None
    instances.append(
        (park := enter(Park(
            terrain=enter(Terrain(path=path / 'park')),
            colormaps=[
                enter(Colormap(path=path / 'pink0')),
                enter(Colormap(path=path / 'pink1')),
                enter(Colormap(path=path / 'pink2')),
                enter(Colormap(path=path / 'pink3')),
            ],
            observation=enter(Observation(path=path / 'observation')),
        )).instance),
    )
    # print("INSTANCES 1")

    earth = None
    instances.append(
        (earth := enter(Park(
            terrain=enter(Terrain(path=path / 'earth')),
            colormaps=[
                enter(Colormap(path=path / 'earth')),
            ],
            observation=None
        )).instance),
    )
    # print("INSTANCES 2")

    instances.append(
        (ambient := enter(Ambient(
        )).instance),
    )
    # print("INSTANCES 3")

    instances.append(
        (distant := enter(Distant(
        )).instance),
    )
    # print("INSTANCES 4")

    instances.append(
        (point := enter(Point(
        )).instance),
    )
    # print("INSTANCES 5")
    
    instances.append(
        (sunlight:= enter(Sunlight(
        )).instance),
    )
    # print("INSTANCES 6")

    # sun_index = len(instances)
    # instances.append(
    #     (sun := Sun(
    #         now=datetime.datetime(year=2023, month=6, day=1, hour=12, tzinfo=datetime.timezone(
    #             offset=datetime.timedelta(hours=-5),
    #             name='EST',
    #         )),
    #     )),
    # )

    instances = Data(instances, type=lib.OSP_INSTANCE)
    defer(lib.ospRelease, instances)
    lib.ospCommit(instances)

    world = lib.ospNewWorld()
    defer(lib.ospRelease, world)
    # lib.ospSetObject(world, b'instance', instances)
    # lib.ospSetObject(world, b'light', sunlight)
    lib.ospCommit(world)

    renderer = lib.ospNewRenderer(
        # b'ao' # does not use lights
        # b'pathtracer'
        b'scivis'
    )

    lib.ospSetVec4f(renderer, b'backgroundColor', *(
        0.8, 0.2, 0.2, 1.0,
        # 0.0, 0.0, 0.0, 1.0,
    ))

    defer(lib.ospRelease, renderer)

    lib.ospSetInt(renderer, b'pixelSamples', 1)
    # lib.ospSetInt(renderer, b'pixelSamples', 3)
    # lib.ospSetFloat(renderer, b'aoIntensity', 0)
    # lib.ospSetInt(renderer, b'aoSamples', 32)
    lib.ospCommit(renderer)

    camera = lib.ospNewCamera(
        # b'orthographic',
        b'perspective',
    )
    defer(lib.ospRelease, camera)
    # lib.ospSetFloat(camera, b'apertureRadius', 0.0)
    # lib.ospSetInt(camera, b'architectural', 1)
    # lib.ospSetFloat(camera, b'height', 100000.0)
    # lib.ospSetFloat(camera, b'aspect', *(
    #     1.0,
    # ))
    lib.ospCommit(camera)

    response = None


    num_x_bins = 2
    num_y_bins = 2
    while True:
        f = open('render-times.txt', "a")

        # render_begin = datetime.datetime.now()
        render_begin = time.process_time_ns()
        request = yield response
        camx, camy, camz = request.camera
        samples = request.samples
        # print(f'{camx},{camy},{camz}')

        # NOTE: look into open image denoise for low-res rendering
        # lib.ospSetInt(renderer, b'pixelSamples', samples)

        zoom, row, col = request.tile
        # px = (col + 0.5) / (2 ** (zoom))
        # px = 1 - px  # flip x
        # py = (row + 0.5) / (2 ** (zoom))
        # py = 1 - py  # flip y
        # pz = (
        #     5.0  # looking at peaks
        #     # -5.0  # looking at valleys
        # )
        # height = 1 / (2 ** zoom)
        # print(f'{px=}, {py=}, {pz=} {height=}')

        dx = 0.0
        dy = request.angle * -0.00001
        dy = 0.0
        dz = (
            # -1.0  # looking at peaks
            1.0  # looking at valleys
        )

        lib.ospSetVec2f(camera, b'imageStart', *(
            0.0 + (col / num_x_bins), 0.0 + (row / num_y_bins)
            # 1.0, 0.0,  # flip x
            # 0.0, 1.0,  # flip y
            # 1.0, 1.0,  # flip x and y
        ))
        lib.ospSetVec2f(camera, b'imageEnd', *(
            0.0 + ((1+col) / num_x_bins), 0.0 + ((1+row) / num_y_bins)
            # 1.0, 1.0,  # flip none
            # 0.0, 1.0  # flip x
            # 1.0, 0.0,  # flip y
            # 0.0, 0.0,  # flip x and y
        ))
#         lib.ospSetFloat(camera, b'height', *(
#             height,
#         ))
        coef = 201.0
        lib.ospSetVec3f(camera, b'position', *(
            # camx, camy, camz,
            camx, camy, camz,
            # px + coef, py + coef, pz + coef,
            # -1700.0, -1400.0, -700.0
        ))
        lib.ospSetVec3f(camera, b'up', *(
            0.0, 1.0, 0.0,  # y+ up
            # 0.0, -1.0, 0.0,  # y- up
            # 0.0, 0.0, 1.0,
        ))
        lib.ospSetVec3f(camera, b'direction', *(
            # dx, dy, dz,
            # -1.0, -1.0, -1.0,
            # -camx, -camy, -camz,
            -camx, -camy, -camz,
        ))
        lib.ospCommit(camera)

        instances = []
        instances.extend([
            point,
            ambient,
            distant,
            # sunlight,
        ])

        if park is not None:
            instances.append(park)
        if earth is not None:
            instances.append(earth)

        # instances.append(
        #     (sun := Sun(
        #         now=(
        #             datetime.datetime(year=2023, month=6, day=1, hour=0, tzinfo=datetime.timezone(
        #                 offset=datetime.timedelta(hours=-5),
        #                 name='EST',
        #             ))
        #             +
        #             datetime.timedelta(hours=request.hour)
        #         ),
        #     )),
        # )

        instances = Data(instances, type=lib.OSP_INSTANCE)
        defer(lib.ospRelease, instances)
        lib.ospCommit(instances)

        lib.ospSetObject(world, b'instance', instances)
        lib.ospSetObject(world, b'light', sunlight)
        lib.ospCommit(world)

        width = request.width
        height = request.height

        framebuffer = lib.ospNewFrameBuffer(
            width,
            height,
            (
                # lib.OSP_FB_RGBA8
                lib.OSP_FB_SRGBA
            ),
            lib.OSP_FB_COLOR,
        )
        
        # Clear framebuffer 
        # lib.ospResetAccumulation?

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
            (
                # -1  # flip y
                1  # flip none
            ),
        )
        image.load()

        lib.ospUnmapFrameBuffer(rgba, framebuffer)

        lib.ospRelease(framebuffer)

        response = sunrise.model.RenderingResponse(
            image=image,
        )

        # time_rendering = datetime.datetime.now().microsecond - render_begin.microsecond
        time_rendering = time.process_time_ns() - render_begin
        f.write(f'{request.width}:{time_rendering}\n')
        # print(f'TIME RENDERING (McS): {time_rendering}')

