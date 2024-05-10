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


__all__ = [
    'not_implemented',
    'dispatch',
]


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


@contextlib.contextmanager
def before(func, /, *args, **kwargs):
    yield func(*args, **kwargs)


@contextlib.contextmanager
def after(func, /, *args, **kwargs):
    try:
        yield
    finally:
        func(*args, **kwargs)
