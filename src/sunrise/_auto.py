"""

"""

from functools import cached_property

__all__ = [
    'auto',
]

class AutoImport:
    @cached_property
    def tqdm(self):
        import tqdm
        import tqdm.auto
        return tqdm

    @cached_property
    def importlib(self):
        import importlib
        return importlib


    @cached_property
    def pd(self):
        return self.pandas
    
    @cached_property
    def pandas(self):
        import pandas
        return pandas
    

    @cached_property
    def np(self):
        return self.numpy

    @cached_property
    def numpy(self):
        import numpy
        import numpy.ctypeslib
        return numpy
    

    @cached_property
    def plt(self):
        return self.matplotlib.pyplot
    
    @cached_property
    def mpl(self):
        return self.matplotlib

    @cached_property
    def tomli(self):
        import tomli
        return tomli

    @cached_property
    def uvicorn(self):
        import uvicorn
        return uvicorn

    @cached_property
    def matplotlib(self):
        import matplotlib
        import matplotlib.pyplot
        return matplotlib


    @cached_property
    def fastapi(self):
        import fastapi
        import fastapi.templating
        import fastapi.staticfiles
        import fastapi.middleware.cors
        return fastapi

    @cached_property
    def structlog(self):
        import structlog
        return structlog
 

    def __getattr__(auto, name: str):
        return auto.importlib.import_module(name)


auto = AutoImport()
