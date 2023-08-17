#!/usr/bin/env python3
"""

"""

from __future__ import annotations

from mediocreatbest import auto
auto.register('ospray',
    'ospray@git+https://gist.github.com/player1537/c06faa784cc993fd6fd9c112d9feb5d9.git',
)
auto.register('np',
    'numpy',
)


lib: auto.ctypes.CDLL = None


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


def Pink(
    *,
    data: auto.pathlib.Path,
) -> lib.OSPMaterial:
    data = auto.numpy.fromfile(
        data,
        dtype=[ ('r', 'f4'), ('g', 'f4'), ('b', 'f4') ],
    )

    data = data.reshape((H, W, 3))

    data = Data(data, type=lib.OSP_VEC3F)




@auto.dataclasses.dataclass
class Park:
    @classmethod
    def load(
        cls: Self,
        *,
        index: auto.pathlib.Path,
        vertex_position: auto.pathlib.Path,
        vertex_texcoord: auto.pathlib.Path,
    ) -> Self:
        index = Data(auto.numpy.fromfile(
            index,
            dtype=[ ('a', 'u4'), ('b', 'u4'), ('c', 'u4'), ('d', 'u4') ],
        ), type=lib.OSP_VEC4UI)

        vertex_position = Data(auto.numpy.fromfile(
            vertex_position,
            dtype=[ ('x', 'f4'), ('y', 'f4'), ('z', 'f4') ],
        ), type=lib.OSP_VEC3F)

        vertex_texcoord = Data(auto.numpy.fromfile(
            vertex_texcoord,
            dtype=[ ('u', 'f4'), ('v', 'f4') ],
        ), type=lib.OSP_VEC2F)

        geometry = lib.ospNewGeometry(b'mesh')


        return cls(
            index=index,
            vertex_position=vertex_position,
            vertex_texcoord=vertex_texcoord,
        )



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