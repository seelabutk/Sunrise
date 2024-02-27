"""

"""

from __future__ import annotations

import sunrise.util

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



@dataclasses.dataclass
class Location:
    lat: float
    lng: float
    alt: float


@dataclasses.dataclass
class Position:
    x: float
    y: float
    z: float


def location_from_name(
    name: str,
    /,
    *,
    alt: float,
    latlngs={
        "Clingman's Dome": (35.562929, -83.497560),
    },
    cls=Location,
):
    lat, lng = latlngs[name]
    return cls(
        lat=lat,
        lng=lng,
        alt=alt,
    )


def position_from_location(
    loc: Location,
    /,
    *,
    math=math,
    cls=Position,
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


def location_from_datetime(
    when: datetime.datetime,
    /,
    *,
    alt: float,
    planets=skyfield.api.load('de421.bsp'),
    timescale=skyfield.api.load.timescale(),
    cls=Location,
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


@dataclasses.dataclass
class RenderingRequest:
    width: int
    height: int
    tile: tuple[
        typing.Annotated[int, 'zoom'],
        typing.Annotated[int, 'row'],
        typing.Annotated[int, 'col'],
    ]
    angle: int # angle 
    cam_pos: tuple[ # camera position offset
        typing.Annotated[float, 'x'],
        typing.Annotated[float, 'y'],
        typing.Annotated[float, 'z'],
    ]

@dataclasses.dataclass
class RenderingResponse:
   image: PIL.Image
