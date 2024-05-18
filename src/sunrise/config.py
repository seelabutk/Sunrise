class Config:
    def __init__(self, config_data):
        self.config = config_data
        self.server_info = self.config["server"]
        self.renderer_info = self.config["renderer"]

    def validate(self):
        print("Validating renderer type...", end="")
        if self.renderer_info["type"] != "scivis" and self.renderer_info["type"] != "ao" and self.renderer_info["type"] != "pathtracer":
            print(f'ERROR: Invalid renderer type: {self.renderer_info["type"]}')
            exit()
        print(" success")
