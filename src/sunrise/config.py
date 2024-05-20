class RendererConfig:
    def __init__(self, render_data):
        self.data = render_data
        self._type = self.data["type"]
        self._samples = self.data["samples"]

        self._valid_types = [
            "scivis",
            "ao",
            "pathtracer",
        ]

    # Validate that the config has valid values we can use
    def validate(self):
        print("Validating renderer type...", end=" ")
        if self._type not in self._valid_types:
            print(f'ERROR: Invalid renderer type: {self._type}')
            exit()
        print("success")

    # Get the type of renderer from the config
    def type(self):
        return self._type

    # Get the number of pixel samples we want to use in the renderer
    def samples(self):
        return self._samples

class ServerConfig:
    def __init__(self, server_data):
        self.data = server_data
        
        self._name = self.data['name']
        self._version = self.data['version']
        self._host = self.data['host']
        self._port = self.data['port']

    def validate(self):
        print("Validating server...", end=" ")
        print("success")

    # Get the port the server should run on
    def port(self):
        return self._port

    # Get the host the server should run on
    def host(self):
        return self._host

    # Get the name of the server
    def name(self):
        return self._name

    # Get the version of the server
    def version(self):
        return self._version

# Overall configuration
class Config:
    def __init__(self, config_data):
        self.config = config_data
        self._renderer = RendererConfig(self.config["renderer"])
        self._server = ServerConfig(self.config["server"])

        self._server.validate()
        self._renderer.validate()

    @property
    def renderer(self):
        return self._renderer

    @property
    def server(self):
        return self._server
