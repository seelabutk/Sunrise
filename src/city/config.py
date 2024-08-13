"""

"""

from __future__ import annotations
from ._auto import auto
import json


class RendererConfig:
    def __init__(self, render_data):
        self.data = render_data
        self._type = self.data["type"]
        self._modules = self.data["modules"]
        self._samples = self.data["samples"]

        # Valid types that we allow for the renderer
        self._valid_types = [
            "scivis",
            "ao",
            "pathtracer",
        ]

        # Valid modules that we allow the renderer to load
        self._valid_modules = [
            "denoiser",
        ]

    # Validate that the config has valid values we can use
    def validate(self):
        print("Validating renderer type...", end=" ")
        if self._type not in self._valid_types:
            print(f'ERROR: Invalid renderer type: {self._type}')
            exit()
        if len(self._modules) != 0:
            for module in self._modules:
                if module not in self._valid_modules:
                    print(f'ERROR: Invalid module: ${module}')
                    exit()
        print("success")

    # Get the type of renderer from the config
    def type(self):
        return self._type

    @property
    def modules(self):
        return self._modules

    # Get the number of pixel samples we want to use in the renderer
    def samples(self):
        return self._samples

class ServerConfig:
    def __init__(self, server_data):
        self.data = server_data
        
        self._name = self.data['name']
        self._version = self.data['version']
        self._bind = self.data['bind']
        self._port = self.data['city_port']
        self._logfile = self.data['city_logfile']
        self._observations = self.data['observations']

    def validate(self):
        print("Validating server...", end=" ")
        if len(self._observations) < 1:
            print(f"[ERROR]: Length of observations needs to be at least 1 but got {len(self._observations)}")
        print("success")

    def observations(self):
        return self._observations

    # Get the port the server should run on
    def port(self):
        if 'SUNRISE_SERVER_PORT' in auto.os.environ:
            return int(auto.os.environ['SUNRISE_SERVER_PORT'])
        
        return self._port

    # Get the host the server should run on
    def bind(self):
        if 'SUNRISE_SERVER_BIND' in auto.os.environ:
            return auto.os.environ['SUNRISE_SERVER_BIND']

        return self._bind

    # Get the name of the server
    def name(self):
        return self._name

    # Get the version of the server
    def version(self):
        return self._version

    # Get the file to senf logs to
    def logfile(self):
        return self._logfile

class ClientConfig:
    def __init__(self, client_data):
        self.data = client_data
        
        # print(self.data)
        self._map_data = self.data["map"]

    def validate(self):
        print("Validating client...", end=" ")
        print("success")

    @property
    def map_data(self):
        return self._map_data


# Overall configuration
class Config:
    def __init__(self, config_data):
        self.config = config_data
        self._renderer = RendererConfig(self.config["renderer"])
        self._server = ServerConfig(self.config["server"])
        self._client = ClientConfig(self.config["client"])

        self._server.validate()
        self._renderer.validate()
        self._client

    @property
    def renderer(self):
        return self._renderer

    @property
    def server(self):
        return self._server

    
    def client_data_response(self):
        config_obj = json.dumps({
            "map-data": self._client.map_data,
        })

        # print(config_obj)
        return config_obj


