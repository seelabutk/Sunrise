"""Lightweight wrapper around Intel OSPRay for Python

Use with:

```python
from ospray import load_library

lib = load_library('libospray.so')
lib.ospInit(None, None)

renderer = lib.ospNewRenderer(b'scivis')
lib.ospSetInt(renderer, b'pixelSamples', 16)
lib.ospCommit(renderer)
```

Refer to [the official OSPRay
document](https://www.ospray.org/documentation.html) for an API reference.

For Jupyter, this is a one-stop-shop for installing and using it (but not for
downloading and extracting the OSPRay libraries).

```python
try:
    import ospray
except ImportError:
    %pip install --disable-version-check --user \
        ospray@git+https://gist.github.com/player1537/3457b026ed6ef6696d758517f55a58df.git
    import ospray

# Initialize OSPRay once
try:
    lib
except NameError:
    lib = ospray.load_library('libospray.so')
    lib.ospInit(None, None)
```

"""


__all__ = [
    'load_library',
]


import ctypes
import os


def load_library(name: str) -> ctypes.CDLL:
    lib = ctypes.CDLL(
        name,
        mode=os.RTLD_LOCAL | os.RTLD_DEEPBIND,
    )


    #--- Utilities

    def enum(name: str, ctype: type, /, **members):
        setattr(lib, name, ctype)
        for k, v in members.items():
            setattr(lib, k, v)


    def opaque(name: str, /):
        setattr(lib, name, ctypes.POINTER(type(name, (ctypes.Structure,), {
            '_fields_': [],
        })))

    def declare(name: str, restype: type, /, *argtypes: list[type]):
        getattr(lib, name).restype = restype
        getattr(lib, name).argtypes = argtypes

    def alias(name: str, ctype: type, /):
        setattr(lib, name, ctype)

    # def struct():
    #     pass


    #--- Top-Level Enums

    enum('OSPError',
        ctypes.c_uint32,

        OSP_NO_ERROR=0,  # no error occurred
        OSP_UNKNOWN_ERROR=1,  # an unknown error occurred
        OSP_INVALID_ARGUMENT=2,  # an invalid argument was specified
        OSP_INVALID_OPERATION=3,  # the operation is not allowed for the specified object
        OSP_OUT_OF_MEMORY=4,  # there is not enough memory to execute the command
        OSP_UNSUPPORTED_CPU=5,  # the CPU is not supported (minimum ISA is SSE4.1 on x86_64 and NEON on ARM64)
        OSP_VERSION_MISMATCH=6,  # a module could not be loaded due to mismatching version

    )  #/OSPError

    enum('OSPDataType',
        ctypes.c_uint32,
        
        # highest bit to represent objects/handles
        OSP_OBJECT = 0x8000000,

        # object subtypes
        OSP_DATA = 0x8000000 + 100 + 0,
        OSP_CAMERA = 0x8000000 + 100 + 1,
        OSP_FRAMEBUFFER = 0x8000000 + 100 + 2,
        OSP_FUTURE = 0x8000000 + 100 + 3,
        OSP_GEOMETRIC_MODEL = 0x8000000 + 100 + 4,
        OSP_GEOMETRY = 0x8000000 + 100 + 5,
        OSP_GROUP = 0x8000000 + 100 + 6,
        OSP_IMAGE_OPERATION = 0x8000000 + 100 + 7,
        OSP_INSTANCE = 0x8000000 + 100 + 8,
        OSP_LIGHT = 0x8000000 + 100 + 9,
        OSP_MATERIAL = 0x8000000 + 100 + 10,
        OSP_RENDERER = 0x8000000 + 100 + 11,
        OSP_TEXTURE = 0x8000000 + 100 + 12,
        OSP_TRANSFER_FUNCTION = 0x8000000 + 100 + 13,
        OSP_VOLUME = 0x8000000 + 100 + 14,
        OSP_VOLUMETRIC_MODEL = 0x8000000 + 100 + 15,
        OSP_WORLD = 0x8000000 + 100 + 16,

        OSP_UCHAR = 2500,
        OSP_VEC2UC = 2501,
        OSP_VEC3UC = 2502,
        OSP_VEC4UC = 2503,

        OSP_VEC4UI = 4500 + 3,
        OSP_VEC2F = 6000 + 1,
        OSP_VEC3F = 6000 + 2,
        OSP_VEC4F = 6000 + 3,

        OSP_LINEAR2F = 12000 + 0,
        OSP_LINEAR3F = 12000 + 1,
        OSP_AFFINE2F = 12000 + 2,
        OSP_AFFINE3F = 12000 + 3,

    )  #/OSPDataType


    #--- Library Lifecycle

    declare('ospInit',
        lib.OSPError,

        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_char_p),
    )

    declare('ospShutdown',
        None,
    )

    declare('ospLoadModule',
        lib.OSPError,

        ctypes.c_char_p,
    )


    #--- OSPDevice

    opaque('OSPDevice')

    declare('ospNewDevice',
        lib.OSPDevice,

        ctypes.c_char_p,
    )

    declare('ospDeviceSetParam',
        None,

        lib.OSPDevice,
        ctypes.c_char_p,
        lib.OSPDataType,
        ctypes.c_void_p,
    )

    declare('ospDeviceCommit',
        None,

        lib.OSPDevice,
    )

    declare('ospSetCurrentDevice',
        None,

        lib.OSPDevice,
    )

    declare('ospDeviceRetain',
        None,

        lib.OSPDevice,
    )

    declare('ospDeviceRelease',
        None,

        lib.OSPDevice,
    )

    declare('ospGetCurrentDevice',
        lib.OSPDevice,
    )

    enum('OSPDeviceProperty',
        ctypes.c_uint32,

        OSP_DEVICE_VERSION = 0,
        OSP_DEVICE_VERSION_MAJOR = 1,
        OSP_DEVICE_VERSION_MINOR = 2,
        OSP_DEVICE_VERSION_PATCH = 3,
        OSP_DEVICE_SO_VERSION = 4,
    )  #/OSPDeviceProperty

    declare('ospDeviceGetProperty',
        ctypes.c_int64,

        lib.OSPDevice,
        lib.OSPDeviceProperty,
    )

    declare('ospDeviceGetLastErrorCode',
        lib.OSPError,

        lib.OSPDevice,
    )

    declare('ospDeviceGetLastErrorMsg',
        ctypes.c_char_p,

        lib.OSPDevice,
    )

    # declare('ospDeviceSetErrorCallback')
    # declare('ospDeviceSetStatusCallback')


    #--- OSPRay Managed Objects

    opaque('OSPObject')

    alias('OSPCamera', lib.OSPObject)
    alias('OSPData', lib.OSPObject)
    alias('OSPFrameBuffer', lib.OSPObject)
    alias('OSPFuture', lib.OSPObject)
    alias('OSPGeometricModel', lib.OSPObject)
    alias('OSPGeometry', lib.OSPObject)
    alias('OSPGroup', lib.OSPObject)
    alias('OSPImageOperation', lib.OSPObject)
    alias('OSPInstance', lib.OSPObject)
    alias('OSPLight', lib.OSPObject)
    alias('OSPMaterial', lib.OSPObject)
    alias('OSPRenderer', lib.OSPObject)
    alias('OSPTexture', lib.OSPObject)
    alias('OSPTransferFunction', lib.OSPObject)
    alias('OSPVolume', lib.OSPObject)
    alias('OSPVolumetricModel', lib.OSPObject)
    alias('OSPWorld', lib.OSPObject)

    declare('ospCommit',
        None,

        lib.OSPObject,
    )

    declare('ospRetain',
        None,

        lib.OSPObject,
    )

    declare('ospRelease',
        None,

        lib.OSPObject,
    )

    declare('ospSetParam',
        None,

        lib.OSPObject,
        ctypes.c_char_p,
        lib.OSPDataType,
        ctypes.c_void_p,
    )

    declare('ospSetObjectAsData',
        None,

        lib.OSPObject,
        ctypes.c_char_p,
        lib.OSPDataType,
        lib.OSPObject,
    )

    def declare_setter(suffix: str, /, *argtypes: list[type], n: int=1):
        assert len(argtypes) > 0
        declare(f'ospSet{suffix}',
            None,

            lib.OSPObject,
            ctypes.c_char_p,
            *(argtypes * n),
        )

    declare_setter('String', ctypes.c_char_p)
    declare_setter('Object', lib.OSPObject)
    declare_setter('Bool', ctypes.c_int)
    declare_setter('Float', ctypes.c_float)
    declare_setter('Int', ctypes.c_int)
    declare_setter('Vec2f', ctypes.c_float, n=2)
    declare_setter('Vec3f', ctypes.c_float, n=3)
    declare_setter('Vec4f', ctypes.c_float, n=4)
    declare_setter('Vec2i', ctypes.c_int, n=2)
    declare_setter('Vec3i', ctypes.c_int, n=3)
    declare_setter('Vec4i', ctypes.c_int, n=4)

    def ospSetAffine3f(obj, name, value):
        assert len(value) == 12
        as_ctype = (ctypes.c_float * 12)(*value)
        lib.ospSetParam(obj, name, lib.OSP_AFFINE3F, ctypes.byref(as_ctype))
    lib.ospSetAffine3f = ospSetAffine3f


    #--- Rendering (OSPFuture)

    declare('ospRenderFrame',
        lib.OSPFuture,

        lib.OSPFrameBuffer,
        lib.OSPRenderer,
        lib.OSPCamera,
        lib.OSPWorld,
    )

    declare('ospGetProgress',
        ctypes.c_float,

        lib.OSPFuture,
    )

    declare('ospCancel',
        None,

        lib.OSPFuture,
    )

    enum('OSPSyncEvent',
        ctypes.c_uint32,

        OSP_NONE_FINISHED = 0,
        OSP_WORLD_RENDERED = 10,
        OSP_WORLD_COMMITTED = 20,
        OSP_FRAME_FINISHED = 30,
        OSP_TASK_FINISHED = 100000
    )

    declare('ospWait',
        None,

        lib.OSPFuture,
        lib.OSPSyncEvent,
    )

    declare('ospIsReady',
        ctypes.c_int,

        lib.OSPFuture,
        lib.OSPSyncEvent,
    )

    declare('ospGetTaskDuration',
        ctypes.c_float,

        lib.OSPFuture,
    )

    declare('ospRenderFrameBlocking',
        ctypes.c_float,

        lib.OSPFrameBuffer,
        lib.OSPRenderer,
        lib.OSPCamera,
        lib.OSPWorld,
    )

    # struct('OSPPickResult')
    # declare('ospPick')


    #--- OSPFrameBuffer

    enum('OSPFrameBufferFormat',
        ctypes.c_uint32,

        OSP_FB_NONE = 0,
        OSP_FB_RGBA8 = 1,
        OSP_FB_SRGBA = 2,
        OSP_FB_RGBA32F = 3,
    )

    enum('OSPFrameBufferChannel',
        ctypes.c_uint32,

        OSP_FB_COLOR = (1 << 0),
        OSP_FB_DEPTH = (1 << 1),
        OSP_FB_ACCUM = (1 << 2),
        OSP_FB_VARIANCE = (1 << 3),
        OSP_FB_NORMAL = (1 << 4),  # in world-space
        OSP_FB_ALBEDO = (1 << 5),
        OSP_FB_ID_PRIMITIVE = (1 << 6),
        OSP_FB_ID_OBJECT = (1 << 7),
        OSP_FB_ID_INSTANCE = (1 << 8)
    )

    declare('ospNewFrameBuffer',
        lib.OSPFrameBuffer,

        ctypes.c_int,
        ctypes.c_int,
        lib.OSPFrameBufferFormat,
        lib.OSPFrameBufferChannel,
    )

    declare('ospMapFrameBuffer',
        ctypes.c_void_p,

        lib.OSPFrameBuffer,
        lib.OSPFrameBufferChannel,
    )

    declare('ospUnmapFrameBuffer',
        None,

        ctypes.c_void_p,
        lib.OSPFrameBuffer,
    )

    declare('ospResetAccumulation',
        None,

        lib.OSPFrameBuffer,
    )

    declare('ospGetVariance',
        ctypes.c_float,

        lib.OSPFrameBuffer,
    )

    
    #--- OSPImageOperation

    declare('ospNewImageOperation',
        lib.OSPImageOperation,

        ctypes.c_char_p,
    )


    #--- OSPRenderer

    declare('ospNewRenderer',
        lib.OSPRenderer,

        ctypes.c_char_p,
    )

    #--- OSPCamera

    declare('ospNewCamera',
        lib.OSPCamera,

        ctypes.c_char_p,
    )


    #--- OSPWorld

    declare('ospNewWorld',
        lib.OSPWorld,
    )

    # struct('OSPBounds')
    # declare('ospGetBounds')

    # lib.OSPBounds = type('OSPBounds', (ctypes.Structure,), {
    #     '_fields_': [
    #         ('xlo', ctypes.c_float),
    #         ('ylo', ctypes.c_float),
    #         ('zlo', ctypes.c_float),
    #         ('xhi', ctypes.c_float),
    #         ('yhi', ctypes.c_float),
    #         ('zhi', ctypes.c_float),
    #     ],
    # })


    #--- OSPLight

    declare('ospNewLight',
        lib.OSPLight,

        ctypes.c_char_p,
    )


    #--- OSPInstance
    
    declare('ospNewInstance',
        lib.OSPInstance,

        lib.OSPGroup,
    )


    #--- OSPGroup

    declare('ospNewGroup',
        lib.OSPGroup,
    )


    #--- OSPGeometricModel

    declare('ospNewGeometricModel',
        lib.OSPGeometricModel,

        lib.OSPGeometry,
    )


    #--- OSPGeometry
    
    declare('ospNewGeometry',
        lib.OSPGeometry,

        ctypes.c_char_p,
    )


    #--- OSPMaterial

    declare('ospNewMaterial',
        lib.OSPMaterial,

        ctypes.c_char_p,
    )


    #--- OSPTexture

    declare('ospNewTexture',
        lib.OSPTexture,

        ctypes.c_char_p,
    )

    enum('OSPTextureFormat',
        ctypes.c_uint32,

        OSP_TEXTURE_RGBA8 = 0,
        OSP_TEXTURE_SRGBA = 1,
        OSP_TEXTURE_RGBA32F = 2,
        OSP_TEXTURE_RGB8 = 3,
        OSP_TEXTURE_SRGB = 4,
        OSP_TEXTURE_RGB32F = 5,
        OSP_TEXTURE_R8 = 6,
        OSP_TEXTURE_R32F = 7,
        OSP_TEXTURE_L8 = 8,
        OSP_TEXTURE_RA8 = 9,
        OSP_TEXTURE_LA8 = 10,
        OSP_TEXTURE_RGBA16 = 11,
        OSP_TEXTURE_RGB16 = 12,
        OSP_TEXTURE_RA16 = 13,
        OSP_TEXTURE_R16 = 14,
    )

    enum('OSPTextureFilter',
        ctypes.c_uint32,

        OSP_TEXTURE_FILTER_BILINEAR = 0,
        OSP_TEXTURE_FILTER_NEAREST = 1,
    )


    #--- OSPVolumetricModel

    declare('ospNewVolumetricModel',
        lib.OSPVolumetricModel,

        lib.OSPVolume,
    )


    #--- OSPVolume

    declare('ospNewVolume',
        lib.OSPVolume,

        ctypes.c_char_p,
    )


    #--- OSPTransferFunction

    declare('ospNewTransferFunction',
        lib.OSPTransferFunction,

        ctypes.c_char_p,
    )


    #--- OSPData

    declare('ospNewSharedData',
        lib.OSPData,

        ctypes.c_void_p,
        lib.OSPDataType,
        ctypes.c_uint64,
        ctypes.c_int64,
        ctypes.c_uint64,
        ctypes.c_int64,
        ctypes.c_uint64,
        ctypes.c_int64,
        ctypes.c_void_p,
        ctypes.c_void_p,
    )

    declare('ospNewData',
        lib.OSPData,

        lib.OSPDataType,
        ctypes.c_uint64,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    declare('ospCopyData',
        None,

        lib.OSPData,
        lib.OSPData,
        ctypes.c_uint64,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    declare('ospNewSharedData1D',
        lib.OSPData,

        ctypes.c_void_p,
        lib.OSPDataType,
        ctypes.c_uint64,
    )

    declare('ospNewSharedData2D',
        lib.OSPData,

        ctypes.c_void_p,
        lib.OSPDataType,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    declare('ospNewSharedData3D',
        lib.OSPData,

        ctypes.c_void_p,
        lib.OSPDataType,
        ctypes.c_uint64,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    declare('ospNewData1D',
        lib.OSPData,

        lib.OSPDataType,
        ctypes.c_uint64,
    )

    declare('ospNewData2D',
        lib.OSPData,

        lib.OSPDataType,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    declare('ospCopyData1D',
        None,

        lib.OSPData,
        lib.OSPData,
        ctypes.c_uint64,
    )

    declare('ospCopyData2D',
        None,

        lib.OSPData,
        lib.OSPData,
        ctypes.c_uint64,
        ctypes.c_uint64,
    )

    return lib


if __name__ == '__main__':
    lib = load_library('libospray.so')
    error = lib.ospInit(None, None)
    assert error == lib.OSP_NO_ERROR, f"{error=!r}"

    device = lib.ospGetCurrentDevice()

    renderer = lib.ospNewCamera(b'perspective')

