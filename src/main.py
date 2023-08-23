#!/usr/bin/env python3
"""

"""

from __future__ import annotations

from mediocreatbest import auto
auto.register('ospray',
    install_names=[
        'ospray@git+https://gist.github.com/player1537/c06faa784cc993fd6fd9c112d9feb5d9.git',
    ],
)
auto.register('np',
    import_names=['numpy'],
    install_names=['numpy'],
)
auto.register('skyfield',
    import_names=['skyfield', 'skyfield.api', 'skyfield.toposlib'],
)


lib: auto.ctypes.CDLL = None


def not_implemented(*args, **kwargs)
    raise NotImplementedError()


def dispatch(default_func: callable, /):
    @auto.functools.wraps(default_func)
    def wrapper(*args, **kwargs):
        if args:
            return dispatch(*args, **kwargs)
        
        return default_func(*args, **kwargs)
    
    dispatch = auto.functools.singledispatch(wrapper)
    wrapper.register = dispatch.register
    return wrapper


class Location:
    lat: float
    lng: float
    alt: float

    from_ = auto.functools.singledispatchmethod(not_implemented)


class Position:
    x: float
    y: float
    z: float

    from_ = auto.functools.singledispatchmethod(not_implemented)


@Location.from_.register
def __position_from_name(
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


@Position.from_.register
def __position_from_location(
    cls,
    loc: Location,
    /,
    *,
    math=auto.math,
):
    # Thanks https://gis.stackexchange.com/a/4148
    
    #> Note that "Lat/Lon/Alt" is just another name for spherical coordinates, and 
    #> phi/theta/rho are just another name for latitude, longitude, and altitude.
    #> :) (A minor difference: altitude is usually measured from the surface of the 
    #> sphere; rho is measured from the center -- to convert, just add/subtract the 
    #> radius of the sphere.)
    phi: Radian = math.radians(lat)
    theta: Radian = math.radians(lng)
    
    # Thanks https://en.wikipedia.org/wiki/Earth_radius
    #> A globally-average value is usually considered to be 6,371 kilometres (3,959 mi)
    rho: Meter = 6_371_000 + alt
    
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


@Location.from_.register
def __location_from_datetime(
    cls,
    when: auto.datetime.datetime,
    /,
    *,
    alt: float,
    planets=auto.skyfield.api.load('de421.bsp'),
    timescale=auto.skyfield.api.load.timescale(),
):
    sun = planets['sun']
    earth = planets['earth']

    position = earth.at(t).observe(sun).apparent()

    location = auto.skyfield.toposlib.wgs84.geographic_position_of(position)
    lat = location.latitude.degrees
    lng = location.longitude.degrees

    return cls(
        lat=lat,
        lng=lng,
        alt=alt,
    )


def Read(path: auto.pathlib.Path, /, *, dtype: auto.numpy.DType) -> auto.numpy.NDArray:
    with open(path, 'rb') as f:
        def Read(fmt: str, /) -> tuple:
            size = auto.struct.calcsize(fmt)
            data = f.read(size)
            assert len(data) == size
            return auto.struct.unpack(size)
        
        N ,= Read('I')
        shape = Read(f'{N}I')
        data = auto.numpy.fromfile(f, dtype=dtype)

    data = data.reshape(shape)
    return data


def Data(array: auto.numpy.ndarray, /, *, type: lib.OSPDataType) -> lib.OSPData:
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


@auto.dataclasses.dataclass
class RenderingRequest:
    pass


@auto.dataclasses.dataclass
class RenderingResponse:
    pass


def with_exit_stack(func: callable, /):
    @auto.functools.wraps(func)
    def wrapper(*args, **kwargs):
        with auto.contextlib.ExitStack() as stack:
            return func(*args, stack=stack, **kwargs)
    
    return wrapper


def with_commit(func: callable, /):
    @auto.functools.wraps(func)
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        lib.ospCommit(ret)
        return ret
    return wrapper

def with_release(func: callable, /):
    @auto.functools.wraps(func)
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        defer(lib.ospRelease, ret)
        return ret
    return wrapper

def with_factory(func: callable, *args, **kwargs):
    factory = auto.functools.partial(func, *args, **kwargs)

    def with_call(func: callable, /):
        @auto.functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(factory(), *args, **kwargs)
        return wrapper
    return with_call


@with_exit_stack
def Render(
    *,
    path: auto.pathlib.Path,
    stack: auto.contextlib.ExitStack,
) -> auto.typing.Generator[RenderingResponse, RenderingRequest, None]:
    close = auto.contextlib.closing
    enter = stack.enter_context
    defer = stack.callback

    def Terrain(
        *,
        path: auto.pathlib.Path,
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
        index = Data(index, type=lib.OSP_VEC3F)
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
        path: auto.pathlib.Path,
    ) -> lib.OSPMaterial:
        data = path / 'OSPTexture.texture2d.data.vec3f.bin'
        data = Read(data, dtype=[ ('r', 'f4'), ('g', 'f4'), ('b', 'f4') ])
        data = Data(data, type=lib.OSP_VEC3F)
        defer(lib.ospRelease, data)

        texture = lib.ospNewTexture(b'texture2d')
        defer(lib.ospRelease, texture)
        lib.ospSetObject(texture, b'data', data)
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
        path: auto.pathlib.Path,
    ) -> lib.OSPData:
        index = path / 'OSPGeometricModel.index.vec1uc.bin'
        index = Read(index, dtype='u1')
        index = Data(index, type=lib.OSP_UCHAR)
        defer(lib.osPRelease, index)

        return index

    def Park(
        *,
        terrain: lib.OSPGeometry,
        colormaps: list[lib.OSPMaterial],
        observation: lib.OSPData,
    ) -> lib.OSPGroup:
        colormaps = Data(colormaps, type=lib.OSP_MATERIAL)
        defer(lib.osPRelease, colormaps)

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

        group = lib.ospNewGroup()
        defer(lib.ospRelease, group)
        lib.ospSetObjectAsData(group, b'geometry', geometric_models)
        lib.ospCommit(group)

        return group
    
    groups = []
    groups.append(
        (group := Park(
            terrain=Terrain(
                path=path / 'park',
            ),
            pinks=[
                Pink(
                    path=path / 'pink0',
                ),
                Pink(
                    path=path / 'pink1',
                ),
                Pink(
                    path=path / 'pink2',
                ),
                Pink(
                    path=path / 'pink3',
                ),
            ],
            observation=Observation(
                path=path / 'observation',
            ),
        )),
    ))

    def Sun(
        *,
        lat: float,
        lng: float,
        alt: float,
    ) -> lib.OSPGroup:
        lights = []

        lights.append(
            (light := lib.ospNewLight(b'distant')),
        )
        defer(lib.ospRelease, light)
        lib.ospCommit(light)

        lights = Data(lights, type=lib.OSP_LIGHT)
        defer(lib.ospRelease, lights)
        lib.ospCommit(lights)

        group = lib.ospNewGroup()
        defer(lib.ospRelease, group)
        lib.ospSetObject(group, b'light', lights)
        lib.ospCommit(group)

        return group

    groups = Data(groups, type=lib.OSP_GROUP)
    defer(lib.ospRelease, groups)
    lib.ospCommit(groups)

    instances = []

    instances.append(
        (instance := lib.ospNewInstance(None)),
    )
    defer(lib.ospRelease, instance)
    lib.ospSetObject(instance, b'group', group)
    lib.ospCommit(instance)

    instances = Data(instances, type=lib.OSP_INSTANCE)
    defer(lib.ospRelease, instances)
    lib.ospCommit(instance)

    lights = []

    lights.append(
        (light := lib.ospNewLight(b'distant')),
    )
    defer(lib.ospRelease, light)
    lib.ospSetVec3f(light, b'position', 539691.0014023371, 3742308.928542019, -5140137.985147873)
    lib.ospSetVec3f(light, b'direction', 
    lib.ospCommit(light)

    world = lib.ospNewWorld()
    defer(lib.ospRelease, world)
    lib.ospSetObject(world, b'instance', instances)
    lib.ospCommit(world)

    renderer = lib.ospNewRenderer(b'pathtracer')
    defer(lib.ospRelease, renderer)
    lib.ospSetInt(renderer, b'pixelSamples', 32)
    lib.ospCommit(renderer)
    
    camera = lib.ospNewCamera(b'panoramic')
    defer(lib.ospRelease, camera)
    lib.ospSetInt(camera, b'architectural', 1)
    lib.ospSetVec4f(camera, b'backgroundColor', *(
        0.0, 0.0, 0.0, 0.0,
    ))
    lib.ospCommit(camera)









def main():
    global lib
    lib = auto.ospray.load_library('libospray.so')



def cli():
    import argparse

    parser = argparse.ArgumentParser()
    args = vars(parser.parse_args())

    main(**args)


if __name__ == '__main__':
    cli()