# from __future__ import annotations

# import sunrise.scene

# import atexit
# import contextlib
# import ctypes
# import dataclasses
# import datetime
# import functools
# import itertools
# import math
# import os
# import pathlib
# import pkgutil
# import struct
# import threading
# import typing
# import io

# import skyfield, skyfield.api, skyfield.toposlib
# import numpy as np
# import ospray
# import PIL.Image
# import flask
# import jinja2


# app = flask.Flask(
#     __name__,
# )


# # # Thanks https://stackoverflow.com/a/60387043
# # app.jinja_loader = jinja2.FunctionLoader(

# #     # Loads file from the templates folder and returns file contents as a string.
# #     # See jinja2.FunctionLoader docs.
# #     lambda name: pkgutil.get_data('sunrise', f'templates/{name}').decode('utf-8'),

# # )


# SUNRISE_LIBOSPRAY_PATH = os.environ.get('SUNRISE_LIBOSPRAY_PATH', 'libospray.so')
# SUNRISE_SCENE_PATH = os.environ['SUNRISE_SCENE_PATH']


# def _initialize():
#     stack = contextlib.ExitStack()
#     atexit.register(_shutdown, stack)

#     with app.app_context():
#         lib = sunrise.scene.load_library(SUNRISE_LIBOSPRAY_PATH)

#         lib.ospInit(None, None)
#         stack.callback(lib.ospShutdown)

#         app.render_lock = threading.Lock()

#         app.logger.info(f'{os.getpid()}: Loading scene from {SUNRISE_SCENE_PATH}')
#         app.render = sunrise.scene.Render(
#             path=pathlib.Path(SUNRISE_SCENE_PATH),
#             stack=stack,
#         )
#         next(app.render)
#         app.logger.info('{os.getpid()}: Scene loaded')


# def _shutdown(stack: contextlib.ExitStack, /):
#     with app.app_context():
#         stack.close()


# _initialize()


# @app.route('/', methods=['GET'])
# def index():
#     return flask.render_template(
#         'index.html.template',
#     )


# @app.route('/api/v1/view/', methods=['GET'])
# def view():
#     args = flask.request.args
#     tile = tuple(map(float, args['tile'].split(',')))
#     camera = tuple(map(float, args['camera'].split(',')))
#     width = int(args.get('width', default=1024))
#     height = int(args.get('height', default=width//2))
#     angle = int(args.get('angle', default=0))
#     pixel_samples = int(args.get('samples', default=3))

#     with app.render_lock:
#         response = app.render.send(sunrise.model.RenderingRequest(
#             width=width,
#             height=height,
#             tile=tile,
#             camera=camera,
#             angle=angle,
#             samples=pixel_samples,
#         ))
    
#     with io.BytesIO() as f:
#         response.image.save(f, 'PNG')

#         return f.getvalue(), 200, {
#             'Content-Type': 'image/png',
#         }

# if __name__ == "__main__":
#     app.run()
