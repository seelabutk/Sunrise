# #!/usr/bin/env python3
# """

# """

# import sunrise, sunrise.model, sunrise.util, sunrise.scene

# import itertools
# import contextlib


# @with_exit_stack
# def main(*, stack):
#     lib = sunrise.scene.load_library('libospray.so')

#     lib.ospInit(None, None)
#     stack.callback(lib.ospShutdown)

#     render = sunrise.scene.Render(
#         path=pathlib.Path.cwd() / 'data',
#         stack=stack.enter_context(contextlib.ExitStack()),
#     )
#     next(render)

#     pos = Position(563.2271446178601, 3706.84551063691, -5153.367883611318)

#     # loc = __location_from_name(Location, "Clingman's Dome", alt=2_000.0)
#     # pos = __position_from_location(Position, loc)

#     for i, hour in enumerate(itertools.chain(
#         [0, 2, 4],
#         [6, 7, 8],
#         [9, 9.5, 10, 10.5, 11, 11.5],
#         [12],
#         [12.5, 13, 13.5, 14, 14.5],
#         [15, 16, 17],
#         [18, 20, 22],
#     )):
#         request = sunrise.model.RenderingRequest(
#             width=1024,
#             height=512,
#             hour=hour,
#             position=(
#                 pos.x, pos.y, pos.z,
#             ),
#             up=(
#                 pos.x, pos.y, pos.z,
#             ),
#             direction=(
#                 3.3002321090438045, 0.29997060238702034, 1.1959763137756454
#                 # -pos.x, -pos.y, -pos.z,
#             ),
#         )
        
#         response = render.send(request)

#         response.image.save(
#             (path := f'tmp/out-{i:02d}.png'),
#             format='PNG',
#         )
#         print(f'Wrote to {path}')


# def cli():
#     import argparse

#     parser = argparse.ArgumentParser()
#     args = vars(parser.parse_args())

#     main(**args)


# if __name__ == '__main__':
#     cli()
