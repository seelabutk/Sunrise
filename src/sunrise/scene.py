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
from matplotlib import pyplot as plt
import cv2 as cv
import ospray
import PIL.Image
import skyfield, skyfield.api, skyfield.toposlib
import threading
import json

obs_cond = threading.Condition()
obs_lock = threading.Lock()

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
    with open(path, 'r+b') as f:
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


def Map(
    path: auto.pathlib.Path,
    *,
    dtype: auto.np.DType,
) -> auto.np.NDArray:
    return auto.np.memmap(path, dtype=dtype, mode='c')

def Data(
    array: np.ndarray,
    /,
    *,
    type: lib.OSPDataType,
    share: bool=False,
) -> lib.OSPData:
    # print("DATA 1")
    if isinstance(array, list):
        all_object = True
        for i, x in enumerate(array):
            if x is None:
                raise ValueError("Nullptr not expected")
            if not isinstance(x, lib.OSPObject):
                all_object = False

        if all_object:
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


def Affine3f(
    *,
    sx: float = 1.0,
    sy: float = 1.0,
    sz: float = 1.0,
    tx: float = 0.0,
    ty: float = 0.0,
    tz: float = 0.0,
) -> tuple[float, ...]:
    return (
        sx, 0, 0,
        0, sy, 0,
        0, 0, sz,
        tx, ty, tz,
    )


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


class Building(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        position = self.path / 'TOSPGeometry.mesh.vec3f[].vertex.position.bin'
        print(f'Loading vertices {position}')
        position = Map(position, dtype=[
            ('x', 'f4'),
            ('y', 'f4'),
            ('z', 'f4'),
        ])
        self.hold(position)
        position = Data(position, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, position)

        quad_index = self.path / 'TOSPGeometry.mesh.vec4u[].index.bin'
        print(f'Loading quads {quad_index}')
        quad_index = Map(quad_index, dtype=[
            ('a', 'u4'),
            ('b', 'u4'),
            ('c', 'u4'),
            ('d', 'u4'),
        ])
        self.hold(quad_index)
        quad_index = Data(quad_index, type=lib.OSP_VEC4UI, share=True)
        self.defer(lib.ospRelease, quad_index)

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

        geometry = lib.ospNewGeometry(b'mesh')
        self.defer(lib.ospRelease, geometry)
        lib.ospSetObject(geometry, b'vertex.position', position)
        lib.ospSetObject(geometry, b'index', quad_index)
        lib.ospCommit(geometry)
        
        # box = self.path / 'OSPGeometry.box.box3f[].box.bin'
        # print(f'Loading box {box}')
        # box = Map(box, dtype=[
        #     ('xlo', 'f4'), ('ylo', 'f4'), ('zlo', 'f4'),
        #     ('xhi', 'f4'), ('yhi', 'f4'), ('zhi', 'f4'),
        # ])
        # self.hold(box)
        # box = Data(box, type=10_000+2, share=True)
        #
        # self.defer(lib.ospRelease, box)
        # print('loaded box')
        #
        # print(f'loading geometry')
        # geometry = lib.ospNewGeometry(b'box')
        # self.defer(lib.ospRelease, geometry)
        # lib.ospSetObject(geometry, b'box', box)
        # lib.ospCommit(geometry)
        # print('loaded geometry')

        print(f'loading materials')
        materials = []
        with open(self.path / 'OSPMaterial[].obj.vec3f.kd.bin', 'rb') as f:
            for i in range(256):
                r, g, b = auto.struct.unpack('fff', f.read(12))


                material = lib.ospNewMaterial(b'obj')
                self.defer(lib.ospRelease, material)
                lib.ospSetVec3f(material, b'kd', r, g, b)
                # if i == 0:
                #     lib.ospSetFloat(material, b'd', 0.1)
                
                lib.ospCommit(material)
                materials.append(material)
        
        materials = Data([
            *materials,
        ], type=lib.OSP_MATERIAL)
        self.defer(lib.ospRelease, materials)
        print('loaded materials')

        index = self.path / 'TOSPGeometricModel.uchar[].index.bin'
        # index = self.path / 'OSPGeometricModel.uchar[].index.bin'
        print(f'loading index {index}')
        index = Map(index, dtype=[
            ('i', 'u1'),
        ])
        self.hold(index)
        index = Data(index, type=lib.OSP_UCHAR, share=True)
        self.defer(lib.ospRelease, index)
        print('loaded index')

        print(f'loading geomodel')
        geomodel = lib.ospNewGeometricModel(None)
        self.defer(lib.ospRelease, geomodel)
        lib.ospSetObject(geomodel, b'geometry', geometry)
        lib.ospSetObject(geomodel, b'material', materials)
        lib.ospSetObject(geomodel, b'index', index)
        lib.ospCommit(geomodel)
        print('loaded geomodel')

        print(f'loading geomodels')
        geomodels = Data([
            geomodel,
        ], type=lib.OSP_GEOMETRIC_MODEL)
        self.defer(lib.ospRelease, geomodel)
        print('loaded geomodels')

        print(f'loading group')
        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'geometry', geomodels)
        lib.ospCommit(group)
        print('loaded group')

        print(f'loading instance')
        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)
        print('loaded instance')

        self.instance = instance


class Background(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path, scale: float):
        super().__init__()

        self.path = path
        self.scale = scale
    
    def make(self):
        vertex__position = self.path / 'OSPGeometry.mesh.vec3f[].vertex.position.bin'
        print(f'loading vertex.position {vertex__position}')
        vertex__position = Map(vertex__position, dtype=[
            ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
        ])
        self.hold(vertex__position)
        vertex__position = Data(vertex__position, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, vertex__position)
        print('loaded vertex.position')
        
        vertex__color = self.path / 'OSPGeometry.mesh.vec3f[].vertex.color.bin'
        print(f'loading vertex.color {vertex__color}')
        vertex__color = Map(vertex__color, dtype=[
            ('r', 'f4'), ('g', 'f4'), ('b', 'f4'),
        ])
        self.hold(vertex__color)
        vertex__color = Data(vertex__color, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, vertex__color)
        print('loaded vertex.color')
        
        index = self.path / 'OSPGeometry.mesh.vec3ui[].index.bin'
        print(f'loading index {index}')
        index = Map(index, dtype=[
            ('i', 'u4'), ('j', 'u4'), ('k', 'u4'),
        ])
        self.hold(index)
        index = Data(index, type=lib.OSP_VEC4UI-1, share=True)
        self.defer(lib.ospRelease, index)
        print('loaded index')

        print(f'loading geometry')
        geometry = lib.ospNewGeometry(b'mesh')
        self.defer(lib.ospRelease, geometry)
        lib.ospSetObject(geometry, b'vertex.position', vertex__position)
        lib.ospSetObject(geometry, b'vertex.color', vertex__color)
        lib.ospSetObject(geometry, b'index', index)
        lib.ospCommit(geometry)
        print('loaded geometry')

        print(f'loading geomodel')
        geomodel = lib.ospNewGeometricModel(None)
        self.defer(lib.ospRelease, geomodel)
        lib.ospSetObject(geomodel, b'geometry', geometry)
        lib.ospCommit(geomodel)
        print('loaded geomodel')

        print(f'loading geomodels')
        geomodels = Data([
            geomodel,
        ], type=lib.OSP_GEOMETRIC_MODEL)
        self.defer(lib.ospRelease, geomodels)
        print('loaded geomodels')

        print(f'loading group')
        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'geometry', geomodels)
        lib.ospCommit(group)
        print('loaded group')

        print(f'loading instance')
        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospSetAffine3f(instance, b'transform', Affine3f(
            sx=-1.0 * self.scale,
            sy=-1.0 * self.scale,
            sz=-1.0 * self.scale,
        ))
        lib.ospCommit(instance)
        print('loaded instance')

        self.instance = instance


class City(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        building = self.path / 'Building'
        print(f'loading building {building}')
        building = self.enter(Building(
            path=building,
        ))
        print('loaded building')
        
        earth = auto.pathlib.Path('data') / 'city' / 'Earth'
        print(f'loading earth {earth}')
        earth = self.enter(Background(
            path=earth,
            scale=0.99 ** 4,
        ))
        print('loaded earth')

        usa = self.path / 'USA'
        print(f'loading usa {usa}')
        usa = self.enter(Background(
            path=usa,
            scale=0.99 ** 3,
        ))
        print('loaded usa')

        tn = self.path / 'TN'
        print(f'loading tn {tn}')
        tn = self.enter(Background(
            path=tn,
            scale=0.99 ** 2,
        ))
        print('loaded tn')

        knox = self.path / 'Knox'
        print(f'loading knox {knox}')
        knox = self.enter(Background(
            path=knox,
            scale=0.99 ** 1,
        ))
        print('loaded knox')

        print(f'loading instances')
        instances = Data([
            building.instance,
            earth.instance,
            usa.instance,
            tn.instance,
            knox.instance,
        ], type=lib.OSP_INSTANCE)
        self.defer(lib.ospRelease, instances)
        print('loaded instances')

        self.instances = instances


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
        self._is_made = False
    
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
        assert index is not None
        self.hold(index)
        index = Data(index, type=lib.OSP_UCHAR, share=True)
        self.defer(lib.ospRelease, index)

        self.index = index


class Environment(WithExitStackMixin):
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
        # self.defer(lib.ospRelease, geomodels)

        group = lib.ospNewGroup()
        self.defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'geometry', geomodels)
        lib.ospCommit(group)

        instance = lib.ospNewInstance(None)
        self.defer(lib.ospRelease, instance)
        lib.ospSetObject(instance, b'group', group)
        lib.ospSetAffine3f(instance, b'transform', Affine3f(
            sx=1/1000,
            sy=1/1000 * -1.0,
            sz=1/1000,
        ))
        lib.ospCommit(instance)

        self.geomodel = geomodel
        self.group = group
        self.geomodels = geomodels
        self.instance = instance
    
    def update_index(self, index):
        geomodel = self.geomodel
        geomodels = self.geomodels
        instance = self.instance
        group = self.group

        lib.ospSetObject(geomodel, b'index', index)
        lib.ospCommit(geomodel)

        lib.ospRelease(geomodels)
        new_geomodels = Data([
            geomodel,
        ], type=lib.OSP_GEOMETRIC_MODEL)

        lib.ospSetObject(group, b'geometry', new_geomodels)
        lib.ospCommit(group)
        
        lib.ospSetObject(instance, b'group', group)
        lib.ospCommit(instance)
        
        self.geomodels = new_geomodels


class Park(WithExitStackMixin):
    def __init__(self, path: auto.pathlib.Path):
        super().__init__()

        self.path = path
    
    def make(self):
        
        self.observations = {
                '0000341': self.enter(Observation(
                    path=self.path / 'observation_0000341'
                )),
                '0000172': self.enter(Observation(
                    path=self.path / 'observation_0000172'
                )),
                '0000223': self.enter(Observation(
                    path=self.path / 'observation_0000223'
                )),
        }
        with open('species_matrix.csv', 'r') as f:
            slist = auto.pd.read_csv(f, header=0).groupby('Species').first()
            for s in slist:
                self.observations[s] = self.enter(Observation(
                    path=self.path / 'observations' / f'observation_{s}'
                ))


        # self.observation = self.observations['0000341']
        # self.observation = self.observations['0000172']
        self.observation_id = '0000172'
        self.observation = self.observations['0000172']
        environment = self.enter(Environment(
                terrain=self.enter(Terrain(
                    path=self.path / 'park',
                )),
                colormaps=[
                    self.enter(Colormap(
                        path=self.path / 'pink0',
                    )),
                    self.enter(Colormap(
                        path=self.path / 'pink1',
                    )),
                    self.enter(Colormap(
                        path=self.path / 'pink2',
                    )),
                    self.enter(Colormap(
                        path=self.path / 'pink3',
                    )),
                ],
            observation=self.observation
#            observation=self.enter(Observation(
#                path=self.path / 'observation_0000341',
#            )),
        ))

        earth = self.enter(Environment(
            terrain=self.enter(Terrain(
                path=self.path / 'earth',
            )),
            colormaps=[
                self.enter(Colormap(
                    path=self.path / 'earth',
                )),
            ],
            observation=None,
        ))

        instances_ = [
            environment.instance,
            earth.instance,
        ]
        instances = Data([
            *instances_,
        ], type=lib.OSP_INSTANCE)
        self.defer(lib.ospRelease, instances)

        self.environment = environment
        self.instances_ = instances_
        self.instances = instances

    def update_observation(self, obs_id: str):
#        if self.observation is not None:
#            self.observation.close()
        
#        self.observation=self.enter(Observation(
#            path=self.path / 'observation_0000341'
#        ))
        if self.observation_id != obs_id:
            print(f"{self.observation_id} != {obs_id}")
            self.observation_id = obs_id
            self.observation = self.observations[obs_id]
            self.environment.update_index(self.observation.index)
        else:
            print("SAME ID")


class Ambient(WithExitStackMixin):
    def __init__(self):
        super().__init__()
    
    def make(self):
        light = lib.ospNewLight(b'ambient')
        self.defer(lib.ospRelease, light)
        lib.ospSetFloat(light, b'intensity', 0.15)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospSetVec3f(light, b'color', 1.0, 0.8, 0.4)
        lib.ospCommit(light)

        self.light = light

        # group = lib.ospNewGroup()
        # self.defer(lib.ospRelease, group)
        # lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        # lib.ospCommit(group)

        # instance = lib.ospNewInstance(None)
        # self.defer(lib.ospRelease, instance)
        # lib.ospSetObject(instance, b'group', group)
        # lib.ospCommit(instance)

        # self.instance = instance


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

        self.light = light

        # group = lib.ospNewGroup()
        # self.defer(lib.ospRelease, group)
        # lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        # lib.ospCommit(group)

        # instance = lib.ospNewInstance(None)
        # self.defer(lib.ospRelease, instance)
        # lib.ospSetObject(instance, b'group', group)
        # lib.ospCommit(instance)

        # self.instance = instance


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

        self.light = light

        # group = lib.ospNewGroup()
        # self.defer(lib.ospRelease, group)
        # lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        # lib.ospCommit(group)

        # instance = lib.ospNewInstance(None)
        # self.defer(lib.ospRelease, instance)
        # lib.ospSetObject(instance, b'group', group)
        # lib.ospCommit(instance)

        # self.instance = instance


class Sunlight(WithExitStackMixin):
    def __init__(self, now: datetime.datetime, light_type: str, intensity: float, sky=(0,0,0)):
        super().__init__()

        self.light_type = light_type
        self.now = now
        self.intensity = intensity
        self.sky = sky

    def make(self):
        # Get the position of the Sun in the sky based on the date & time
        location = self.location_from_datetime(self.now, alt=10_000.0)
        position = sunrise.model.position_from_location(location)

        light = lib.ospNewLight(self.light_type.encode())
        self.defer(lib.ospRelease, light)
        lib.ospSetInt(light, b'intensityQuantity', 1)
        lib.ospSetVec3f(light, b'color', 1.0, 0.8, 0.4)
        
        if self.light_type == 'distant':
            lib.ospSetFloat(light, b'intensity', 3)
        elif self.light_type == 'sunSky':
            # lib.ospSetFloat(light, b'intensity', 0.02)
            lib.ospSetFloat(light, b'horizonExtension', 0.2)
            lib.ospSetFloat(light, b'turbidity', 8)
            lib.ospSetFloat(light, b'albedo', 0.15)
            lib.ospSetVec3f(light, b'up', *(self.sky))
            # lib.ospSetVec3f(light, b'up', position.x, position.y, position.z)

        lib.ospSetVec3f(light, b'position', position.x, position.y, position.z)
        lib.ospSetVec3f(light, b'direction', -position.x, -position.y, -position.z) 
        lib.ospSetFloat(light, b'intensity', self.intensity)
        
        lib.ospCommit(light)

        self.light = light

        # group = lib.ospNewGroup()
        # self.defer(lib.ospRelease, group)
        # lib.ospSetObjectAsData(group, b'light', lib.OSP_LIGHT, light)
        # lib.ospCommit(group)

        # instance = lib.ospNewInstance(None)
        # self.defer(lib.ospRelease, instance)
        # lib.ospSetObject(instance, b'group', group)
        # lib.ospCommit(instance)

        # self.instance = instance

    def location_from_datetime(
        self,
        when: datetime.datetime,
        /,
        *,
        alt: float,
        planets=skyfield.api.load('de421.bsp'),
        timescale=skyfield.api.load.timescale(),
        cls=sunrise.model.Location,
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

class HDRI(WithExitStackMixin):
    def __init__(self, path):
        super().__init__()
        self.path = path

    def make(self):
        data = self.data()
        
        texture = lib.ospNewTexture(b'texture2d')
        self.defer(lib.ospRelease, texture)
        lib.ospSetObject(texture, b'data', data)
        lib.ospSetUInt(texture, b'format', lib.OSP_TEXTURE_RGB32F)
        lib.ospCommit(texture)

        light = lib.ospNewLight(b'hdri')
        self.defer(lib.ospRelease, light)
        # lib.ospSetInt(light, b'intensityQuantity', 1)
        # lib.ospSetVec3f(light, b'color', 1.0, 0.8, 0.4)
        # lib.ospSetVec3f(light, b'color', 1.0, 1.0, 1.0)
        lib.ospSetFloat(light, b'intensity', 7)
        lib.ospSetObject(light, b'map', texture)
        # lib.ospSetVec3f(light, b'up', 0.0, 1.0, 0.0)
        # lib.ospSetVec3f(light, b'direction', 0.0, 1.0, 1.0)
        lib.ospCommit(light)

        self.texture = texture
        self.light = light

    def data(self):
        data = self.path
        data = Read(data, dtype=[ ('r', 'f4'), ('g', 'f4'), ('b', 'f4') ])
        self.hold(data)
        data = Data(data, type=lib.OSP_VEC3F, share=True)
        self.defer(lib.ospRelease, data)
        return data



class Scene(WithExitStackMixin):
    def __init__(self, what: City | Park,):
        super().__init__()

        self.what = what
        self.config = {}

    # Set the configuration of the renderer
    def configure(self, config):
        self.config = config
    
    def make(self):
        ambient = self.enter(Ambient(
        ))

        distant = self.enter(Distant(
        ))

        point = self.enter(Point(
        ))

        hdri = self.enter(HDRI(
            path=auto.pathlib.Path('data/space/OSPTexture.texture2d.data.vec2f.bin')
        ))

        sunlight = self.enter(Sunlight(
            now=(
                datetime.datetime(year=2023, month=6, day=1, hour=15, tzinfo=datetime.timezone(
                    offset=datetime.timedelta(hours=0),
                    # offset=datetime.timedelta(hours=-5),
                    name='EST'
                    ))
                + 
                datetime.timedelta(hours=0)
                # datetime.timedelta(hours=5)
                # datetime.timedelta(hours=request.hour)
            ),
            light_type='distant',
            intensity=3.0,
        ))

        
        denoiser = lib.ospNewImageOperation(b'denoiser')
        lib.ospCommit(denoiser)
        self.defer(lib.ospRelease, denoiser)

        self.imageops = Data([
            denoiser
        ], type=lib.OSP_IMAGE_OPERATION)
        lib.ospCommit(self.imageops)
        self.defer(lib.ospRelease, self.imageops)

        lights = Data([
            # ambient.light,
            # distant.light,
            # point.light,
            # sunlight.light,
            hdri.light,
        ], type=lib.OSP_LIGHT)
        # self.defer(lib.ospRelease, lights)

        world = lib.ospNewWorld()
        self.defer(lib.ospRelease, world)
        lib.ospSetObject(world, b'instance', self.what.instances)
        lib.ospSetObject(world, b'light', lights)
        lib.ospSetBool(world, b'dynamicScene', False)
        lib.ospSetBool(world, b'compactMode', True)
        # lib.ospSetBool(world, b'dynamicScene', True)
        lib.ospCommit(world)

        renderer = (
            # b'ao'  # does not use lights
            # b'pathtracer'
            # b'scivis'
            self.config.renderer.type().encode('utf-8')
        )
        renderer = lib.ospNewRenderer(renderer)
        self.defer(lib.ospRelease, renderer)
        
        lib.ospSetInt(renderer, b'pixelSamples', self.config.renderer.samples())
        lib.ospSetVec4f(renderer, b'backgroundColor', *(
            0.0, 0.0, 0.0, 1.0, # Black background
            # 1.0, 1.0, 1.0, 1.0, # White background
            # 0.8, 0.2, 0.2, 1.0,
        ))
        lib.ospCommit(renderer)

        camera = (
            # b'orthographic'
            b'perspective'
        )
        camera = lib.ospNewCamera(camera)
        self.defer(lib.ospRelease, camera)
        lib.ospCommit(camera)

        self.world = world
        self.renderer = renderer
        self.camera = camera
        self.lights = lights

        self.ambient = ambient
        self.distant = distant
        self.hdri = hdri
        self.sunlight = sunlight
        self.logger = None
        self.observation_id = ''

    # Update the aspect ratio of the camera dynamically
    def update_camera(self, width, height):
        lib.ospSetFloat(self.camera, b'aspect', width / height)
        lib.ospCommit(self.camera)

    # Update the index material for the species that we want to view
    def update_observation(self, observation_id: str):
        index_start = time.time_ns()

        self.what.update_observation(observation_id)
        
        index_time = time.time_ns() - index_start
        self.logger.info(event='observation_recreation_ns', time=index_time)

    def update_lights(self, hour: int):
        light_start = time.time_ns()
        self.sunlight = self.enter(Sunlight(
            now=(
                datetime.datetime(year=2023, month=6, day=1, hour=0, tzinfo=datetime.timezone(
                    offset=datetime.timedelta(hours=0),  # Eastern Time
                    # offset=datetime.timedelta(hours=-5),  # Eastern Time
                    name='EST'
                ))
                + 
                datetime.timedelta(hours=hour)
                # datetime.timedelta(hours=-15)
            ),
            light_type=self.request.light,
            intensity=0.014,
            sky=self.request.position
        ))

        
        self.distant = self.enter(Sunlight(
            now=(
                datetime.datetime(year=2023, month=6, day=1, hour=0, tzinfo=datetime.timezone(
                    offset=datetime.timedelta(hours=0),  # Eastern Time
                    # offset=datetime.timedelta(hours=6),  # Eastern Time
                    # offset=datetime.timedelta(hours=-5),  # Eastern Time
                    name='EST'
                ))
                + 
                datetime.timedelta(hours=hour)
                # datetime.timedelta(hours=-15)
            ),
            light_type='distant',
            intensity=3.0,
            # light_type='distant',
        ))

        lights = Data([
            # self.ambient.light,
            self.distant.light,
            # point.light,
            self.sunlight.light,
            self.hdri.light,
        ], type=lib.OSP_LIGHT)
        light_time = time.time_ns() - light_start
        self.logger.info(event='light_recreation_ns', time=light_time)
        return lights

    def render(self, request: model.RenderingRequest):
        render_start = time.time_ns()
        self.request = request
        world = self.world
        renderer = self.renderer
        self.update_camera(request.width, request.height)
        camera = self.camera

        id = self.request.observation 
        self.update_observation(id)
        
        lib.ospRelease(self.lights)
        self.lights = self.update_lights(request.hour)
        lib.ospSetObject(world, b'light', self.lights)
        lib.ospCommit(self.lights)
        # self.defer(lib.ospRelease, lights)
        lib.ospCommit(world)

            
        # lib.ospSetInt(renderer, b'pixelSamples', samples)
        # 2of2
        row, col = request.tile
        
        col_id, num_x_bins = map(int, col.split('of'))
        row_id, num_y_bins = map(int, row.split('of'))
        # num_x_bins = 2
        # num_y_bins = 2

        img_start_x, img_end_x = col_id / num_x_bins, (1+col_id) / num_x_bins
        img_start_y, img_end_y = row_id / num_y_bins, (1+row_id) / num_y_bins

        GHOST = 16
        dx = (img_end_x - img_start_x) / request.width
        dy = (img_end_y - img_start_y) / request.height

        img_start_x, img_end_x = img_start_x - GHOST * dx, img_end_x + GHOST * dx
        img_start_y, img_end_y = img_start_y - GHOST * dy, img_end_y + GHOST * dy

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

        lib.ospSetVec2f(camera, b'imageStart', *(
            img_start_x, img_start_y
            # 0.0 + (col_id / num_x_bins), 0.0 + (row_id / num_y_bins)
            # 0.0 + (col / num_x_bins), 0.0 + (row / num_y_bins)
            # 1.0, 0.0,  # flip x
            # 0.0, 1.0,  # flip y
            # 1.0, 1.0,  # flip x and y
        ))
        lib.ospSetVec2f(camera, b'imageEnd', *(
            img_end_x, img_end_y
            # 0.0 + ((1+col_id) / num_x_bins), 0.0 + ((1+row_id) / num_y_bins)
            # 0.0 + ((1+col) / num_x_bins), 0.0 + ((1+row) / num_y_bins)
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
            request.position
            # camx, camy, camz,
            # camx, camy, camz,
            # px + coef, py + coef, pz + coef,
            # -1700.0, -1400.0, -700.0
        ))
        lib.ospSetVec3f(camera, b'up', *(
            request.up
            # 0.0, 1.0, 0.0,  # y+ up
            # 0.0, -1.0, 0.0,  # y- p
            # 0.0, 0.0, 1.0,
        ))
        lib.ospSetVec3f(camera, b'direction', *(
            request.direction
            # dx, dy, dz,
            # -1.0, -1.0, -1.0,
            # -camx, -camy, -camz,
            # -camx, -camy, -camz,
        ))
        lib.ospCommit(camera)

        framebuffer = lib.ospNewFrameBuffer(
            request.width + 2 * GHOST,
            request.height + 2 * GHOST,
            (
                # lib.OSP_FB_RGBA8
                lib.OSP_FB_SRGBA
            ),
            lib.OSP_FB_COLOR,
        )

        lib.ospSetObject(framebuffer, b'imageOperation', self.imageops)
        lib.ospCommit(framebuffer)

        _variance: float = lib.ospRenderFrameBlocking(
            framebuffer,
            self.renderer,
            self.camera,
            self.world,
        )

        rgba = lib.ospMapFrameBuffer(framebuffer, lib.OSP_FB_COLOR)
        encoding_start = time.time_ns()
        image = PIL.Image.frombytes(
            'RGBA',
            (request.width + 2*GHOST, request.height + 2*GHOST),
            ctypes.string_at(rgba, size=((request.width + 2*GHOST)* (request.height + 2*GHOST) * 4)),
            'raw',
            'RGBA',
            0,
            1,
        )
        w, h = image.size
        print(f'W: {w}, H: {h}')
        image.load()
        encoding_time = time.time_ns() - encoding_start
        self.logger.info(event='encoding_time_ns', time=encoding_time, dimension=[request.width, request.height])
#        cv_img = cv.cvtColor(np.array(image), cv.COLOR_RGB2BGR)
#        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
#        sharpened = cv.filter2D(cv_img, -1, kernel)
#        image = PIL.Image.fromarray(sharpened)

        lib.ospUnmapFrameBuffer(rgba, framebuffer)

        lib.ospRelease(framebuffer)

        time_rendering = time.time_ns() - render_start
        self.logger.info(event='rendering_time_ns', time=time_rendering, dimension=[request.width, request.height])
        image = image.crop((
            GHOST,
            GHOST,
            w - GHOST,
            h - GHOST,
        ))
        w, h = image.size
        print(f'After Crop: W: {w}, H: {h}')

        return sunrise.model.RenderingResponse(
            image=image,
        )

    def arender(self, request: RenderingRequest, logger) -> auto.asyncio.Future[RenderingResponse]:
        self.logger = logger
        future = auto.asyncio.Future()

        thread = auto.threading.Thread(
            target=lambda: future.set_result(self.render(request)),
        )
        thread.start()

        return future


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
    request = yield response

    scene = enter(Scene(
        # what=enter(City(
        #     path=auto.pathlib.Path('/mnt/seenas2/data/2023_ORNL_Building_Energy_Models/gen'),
        # )),
        what=enter(Park(
            observation_id='0000341',
            path=auto.pathlib.Path('data'),
        )),
    ))
    world = scene.world
    renderer = scene.renderer
    camera = scene.camera

    response = None


    num_x_bins = 2
    num_y_bins = 2
    while True:
        render_begin = time.process_time_ns()
        # request = yield response

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
