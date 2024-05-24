"""

"""

#%%

from sunrise._auto import auto


#%%

config = auto.types.SimpleNamespace()

(config.gpu, config.resolution) = (
    # CPU @ 16x16
    # - 1.7s, fast
    # - Does not crash.
    # - Produces an opaque checkerboard pattern.
    # - No triangle is visible.
    # (False, 16)

    # GPU @ 16x16
    # - 30s, slow (oops, because it needs SYCL_CACHE_PERSISTENT=1)
    # - Does not crash
    # - 90% of checkboard pattern is invisible.
    # - leftmost 10% of pattern is visible, but partially transparent.
    # - Triangle is fully visible
    # (True, 16)

    # GPU @ 2x2
    # - 30s, slow (oops, because it needs SYCL_CACHE_PERSISTENT=1)
    # - Does not crash
    # - 30% of checkboard pattern is invisible, 2/3rd towards the right.
    # - leftmost 70% of pattern is visible, but partially transparent.
    # - Triangle is mostly visible, obscured by the checkerboard.
    (True, 2)

    # CPU @ 2x2
    # - Identical to CPU @ 16x16
    # (False, 2)

    # GPU @ 17x17
    # - No crash.
    # - slow. 30s. (oops, because it needs SYCL_CACHE_PERSISTENT=1)
    # (True, 17)

    # GPU @ 18x18
    # - No crash.
    # - slow. 30s. (oops, because it needs SYCL_CACHE_PERSISTENT=1)
    # (True, 18)

    # GPU @ 19x19
    # - Crash during osp::Data::copy, specifically a memcpy.
    # - Crashes after ~3.5 seconds.
    # - c.f. the "XXX" comment in the Material function.
    # (True, 19)
)


#%%

stack = auto.contextlib.ExitStack()
enter = stack.enter_context
defer = stack.callback


#%%

lib = auto.ospray.load_library('libospray.so')
lib.ospInit(None, None)

if config.gpu:
    lib.ospLoadModule(b'gpu')


#%%

if config.gpu:
    device = lib.ospNewDevice(b'gpu')
    defer(lib.ospDeviceRelease, device)
    lib.ospDeviceCommit(device)

    lib.ospSetCurrentDevice(device)


#%%

def Data(
    array: auto.np.ndarray,
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
            array = (auto.ctypes.cast(x, auto.ctypes.c_void_p).value for x in array)
            assert(array != None)
            array = auto.np.fromiter(array, dtype=auto.np.uintp)
            return Data(array, type=type)
    
        array = auto.np.asarray(array)
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

    # print(f'ospNewSharedData({array.ctypes.data} ({array.ravel()}), {type},  {array.shape[0]}, {array.strides[0]},  {array.shape[1]}, {array.strides[1]},  {array.shape[2]}, {array.strides[2]},  {None}, {None})')
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
    lib.ospCommit(dst)
    lib.ospCopyData(src, dst, 0, 0, 0)
    lib.ospCommit(dst)
    # print("DATA 5")

    lib.ospRelease(src)
    # print("DATA 6")
    return dst


#%%

def Noise(
    size: int,
    tint: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> auto.np.ndarray:
    rgb = auto.np.empty(
        shape=(size, size),
        dtype=[
            ('r', 'f4'), ('g', 'f4'), ('b', 'f4'),
        ],
    )

    auto.np.random.seed(0)
    rgb['r'] = auto.np.random.rand(size, size)
    rgb['g'] = auto.np.random.rand(size, size)
    rgb['b'] = auto.np.random.rand(size, size)

    # tint
    rgb['r'] += tint[0]
    rgb['g'] += tint[1]
    rgb['b'] += tint[2]

    # clamp
    rgb['r'] = auto.np.clip(rgb['r'], 0, 1)
    rgb['g'] = auto.np.clip(rgb['g'], 0, 1)
    rgb['b'] = auto.np.clip(rgb['b'], 0, 1)

    # gaussian convolution
    for _ in range(3):
        rgb['r'] = auto.scipy.ndimage.gaussian_filter(rgb['r'], 1)
        rgb['g'] = auto.scipy.ndimage.gaussian_filter(rgb['g'], 1)
        rgb['b'] = auto.scipy.ndimage.gaussian_filter(rgb['b'], 1)
    
    return rgb


#%%

position = auto.np.array([
    (0.3, 0.3, -0.3),
    (0.7, 0.3, -0.3),
    (0.5, 0.7, -0.3),
], dtype=[
    ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
])

index = auto.np.array([
    (0, 1, 2),
], dtype=[
    ('a', 'u4'), ('b', 'u4'), ('c', 'u4'),
])


#%%

position = Data(position, type=lib.OSP_VEC3F)
defer(lib.ospRelease, position)
lib.ospCommit(position)


#%%

index = Data(index, type=lib.OSP_VEC4UI-1)
defer(lib.ospRelease, index)
lib.ospCommit(index)


#%%

geometry = lib.ospNewGeometry(b'mesh')
defer(lib.ospRelease, geometry)
lib.ospSetObject(geometry, b'vertex.position', position)
lib.ospSetObject(geometry, b'index', index)
lib.ospCommit(geometry)


#%%

material = lib.ospNewMaterial(b'obj')
defer(lib.ospRelease, material)
lib.ospSetVec3f(material, b'kd', *(
    0.0, 0.0, 0.0,
))
lib.ospCommit(material)


#%%

geomodel = lib.ospNewGeometricModel(None)
defer(lib.ospRelease, geomodel)
lib.ospSetObject(geomodel, b'geometry', geometry)
lib.ospSetObject(geomodel, b'material', material)
lib.ospCommit(geomodel)


#%%

geomodels = Data([
    geomodel,
], type=lib.OSP_GEOMETRIC_MODEL)
defer(lib.ospRelease, geomodels)
lib.ospCommit(geomodels)


#%%

group = lib.ospNewGroup()
defer(lib.ospRelease, group)
lib.ospSetObject(group, b'geometry', geomodels)
lib.ospCommit(group)


#%%

triangle = \
instance = lib.ospNewInstance(None)
defer(lib.ospRelease, instance)
lib.ospSetObject(instance, b'group', group)
lib.ospCommit(instance)


#%%

NROW = 16
NCOL = 16
NMAT = 256

NVERT = (NROW + 1) * (NCOL + 1)
NQUAD = NROW * NCOL

position = auto.np.empty(
    shape=NVERT,
    dtype=[
        ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
    ],
)

texcoord = auto.np.empty(
    shape=NVERT,
    dtype=[
        ('u', 'f4'), ('v', 'f4'),
    ],
)

index = auto.np.empty(
    shape=NQUAD,
    dtype=[
        ('a', 'u4'), ('b', 'u4'), ('c', 'u4'), ('d', 'u4'),
    ],
)

mindex = auto.np.empty(
    shape=NQUAD,
    dtype=[
        ('i', 'u1'),
    ],
)


#%%

VERT = iter(auto.itertools.count())
QUAD = iter(auto.itertools.count())

for row in range(NROW + 1):
    for col in range(NCOL + 1):
        i = next(VERT)
        position[i] = (col / NCOL, row / NROW, 0)
        texcoord[i] = (col / NCOL, row / NROW)

for row in range(NROW):
    for col in range(NCOL):
        i = next(QUAD)
        index[i] = (
            col + (row + 0) * (NCOL + 1),
            col + (row + 1) * (NCOL + 1),
            col + 1 + (row + 1) * (NCOL + 1),
            col + 1 + (row + 0) * (NCOL + 1),
        )
        mindex[i] = (row + col) % NMAT


#%%

position = Data(position, type=lib.OSP_VEC3F)
defer(lib.ospRelease, position)
lib.ospCommit(position)


#%%

texcoord = Data(texcoord, type=lib.OSP_VEC2F)
defer(lib.ospRelease, texcoord)
lib.ospCommit(texcoord)


#%%

index = Data(index, type=lib.OSP_VEC4UI)
defer(lib.ospRelease, index)
lib.ospCommit(index)


#%%

geometry = lib.ospNewGeometry(b'mesh')
defer(lib.ospRelease, geometry)
lib.ospSetObject(geometry, b'vertex.position', position)
lib.ospSetObject(geometry, b'vertex.texcoord', texcoord)
lib.ospSetObject(geometry, b'index', index)
lib.ospCommit(geometry)


#%%

def Material(tint):
    print('a', flush=True)
    rgb = Noise(config.resolution, tint=tint)
    print('a1', flush=True)

    # XXX: The bug occurs right here.
    rgb = Data(rgb, type=lib.OSP_VEC3F)


    print('a2', flush=True)
    defer(lib.ospRelease, rgb)
    print('a3', flush=True)
    lib.ospCommit(rgb)

    print('b', flush=True)
    texture = lib.ospNewTexture(b'texture2d')
    defer(lib.ospRelease, texture)
    lib.ospSetObject(texture, b'data', rgb)
    lib.ospSetUInt(texture, b'format', lib.OSP_TEXTURE_RGB32F)
    lib.ospCommit(texture)

    print('c', flush=True)
    material = lib.ospNewMaterial(b'obj')
    defer(lib.ospRelease, material)
    lib.ospSetObject(material, b'map_kd', texture)
    lib.ospCommit(material)

    return material

one = Material((0.8, 0.2, 0.2))
two = Material((0.2, 0.8, 0.2))
three = Material((0.2, 0.2, 0.8))
four = Material((0.8, 0.8, 0.2))

materials = list(auto.more_itertools.take(NMAT, auto.itertools.cycle([
    one,
    two,
    three,
    four,
])))


#%%

materials = Data(materials, type=lib.OSP_MATERIAL)
defer(lib.ospRelease, materials)
lib.ospCommit(materials)


#%%

mindex = Data(mindex, type=lib.OSP_UCHAR)
defer(lib.ospRelease, mindex)
lib.ospCommit(mindex)


#%%

geomodel = lib.ospNewGeometricModel(None)
defer(lib.ospRelease, geomodel)
lib.ospSetObject(geomodel, b'geometry', geometry)
lib.ospSetObject(geomodel, b'material', materials)
lib.ospSetObject(geomodel, b'index', mindex)
lib.ospCommit(geomodel)


#%%

geomodels = Data([
    geomodel,
], type=lib.OSP_GEOMETRIC_MODEL)
defer(lib.ospRelease, geomodels)
lib.ospCommit(geomodels)


#%%

group = lib.ospNewGroup()
defer(lib.ospRelease, group)
lib.ospSetObject(group, b'geometry', geomodels)
lib.ospCommit(group)


#%%

plane = \
instance = lib.ospNewInstance(None)
defer(lib.ospRelease, instance)
lib.ospSetObject(instance, b'group', group)
lib.ospCommit(instance)


#%%

instances = Data([
    triangle,
    plane,
], type=lib.OSP_INSTANCE)
defer(lib.ospRelease, instances)
lib.ospCommit(instances)


# %%

light = lib.ospNewLight(b'ambient')
defer(lib.ospRelease, light)
lib.ospSetVec3f(light, b'color', 1.0, 1.0, 1.0)
lib.ospSetFloat(light, b'intensity', 0.5)
lib.ospCommit(light)


# %%

lights = Data([
    light,
], type=lib.OSP_LIGHT)
defer(lib.ospRelease, lights)
lib.ospCommit(lights)


#%%

world = lib.ospNewWorld()
defer(lib.ospRelease, world)
lib.ospSetObject(world, b'instance', instances)
lib.ospSetObject(world, b'light', lights)
lib.ospCommit(world)


#%%

renderer = lib.ospNewRenderer(b'scivis')
defer(lib.ospRelease, renderer)
lib.ospSetInt(renderer, b'pixelSamples', 1)
lib.ospSetVec4f(renderer, b'backgroundColor', *(
    0.8, 0.2, 0.2, 1.0,
))
lib.ospCommit(renderer)


#%%

camera = lib.ospNewCamera(b'orthographic')
defer(lib.ospRelease, camera)
lib.ospSetFloat(camera, b'height', 1.02)
lib.ospSetVec3f(camera, b'position', *(
    # 595.904, -3763.495, 5230.185,
    0.5, 0.5, 1.0,
))
lib.ospSetVec3f(camera, b'direction', *(
    # -595.904, 3763.495, -5230.185,
    0, 0, -1,
))
lib.ospSetVec3f(camera, b'up', *(
    0.000, 1.000, 0.000,
))
lib.ospCommit(camera)


#%%

framebuffer = lib.ospNewFrameBuffer(
    (w := 512),
    (h := 512),
    lib.OSP_FB_SRGBA,
    lib.OSP_FB_COLOR,
)
defer(lib.ospRelease, framebuffer)
lib.ospCommit(framebuffer)


#%%

_variance: float = lib.ospRenderFrameBlocking(
    framebuffer,
    renderer,
    camera,
    world,
)

rgba = lib.ospMapFrameBuffer(framebuffer, lib.OSP_FB_COLOR)
image = auto.PIL.Image.frombytes(
    'RGBA',
    (w, h),
    auto.ctypes.string_at(rgba, size=(w * h * 4)),
    'raw',
    'RGBA',
    0,
    1,
)
image.load()

image.save(
    (path := auto.pathlib.Path('image.png').resolve()),
    'PNG',
)
print(f'Wrote {path.stat().st_size:,d} bytes to {path}')

lib.ospUnmapFrameBuffer(rgba, framebuffer)


#%%

stack.close()
