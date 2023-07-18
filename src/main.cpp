//std
#include <cstdarg> // std::va_list, va_start, va_end
#include <cstdlib> // std::exit
#include <cstdio> // std::fprintf, std::vfprintf, std::fopen, std::ftell, std::fseek, std::fclose, stderr
#include <cstring> // std::memcpy
#include <string> // std::string
#include <vector> // std::vector
#include <tuple> // std::make_tuple, std::tie
#include <iostream> // std::cin
#include <map> // std::map
#include <chrono> // std::chrono
#include <filesystem> // std::filesystem::path

//ospray
#include <ospray/ospray.h>
#include <ospray/ospray_util.h>

//stb
#include <stb_image_write.h>


//--- Utilities

static void xDie(const char *fmt, ...) {
    std::va_list args;
    va_start(args, fmt);
    std::fprintf(stderr, "ERROR: ");
    std::vfprintf(stderr, fmt, args);
    std::fprintf(stderr, "\n");
    va_end(args);
    std::exit(EXIT_FAILURE);
}

static std::nullptr_t xWarn(const char *filename, int line, const char *function, const char *fmt, ...) {
    std::va_list args;
    va_start(args, fmt);
    std::fprintf(stderr, "WARNING:%s:%d: %s:", filename, line, function);
    std::vfprintf(stderr, fmt, args);
    std::fprintf(stderr, "\n");
    va_end(args);

    return nullptr;
}

#define xWarn(fmt, ...) xWarn(__FILE__, __LINE__, __FUNCTION__, fmt, ## __VA_ARGS__)

struct stbiContext {
    size_t offset;
    size_t *size;
    void **data;
};

static void stbiCallback(void *context_, void *data, int size) {
    stbiContext *context = static_cast<stbiContext *>(context_);

    while (context->offset + size >= *context->size) {
        *context->size *= 2;
        *context->data = std::realloc(*context->data, *context->size);
    }

    void *dest = static_cast<std::byte *>(*context->data) + context->offset;
    const void *src = data;
    std::size_t count = size;
    std::memcpy(dest, src, count);

    context->offset += size;
}

static size_t __attribute__((unused)) xToJPG(const void *rgba, int width, int height, size_t *outsize, void **outdata) {
    if (*outsize == 0) {
        *outsize = 1024;
        *outdata = std::malloc(*outsize);
    }

    stbiContext context;
    context.offset = 0;
    context.size = outsize;
    context.data = outdata;

    int success;
    stbi_write_func *func = stbiCallback;
    void *context_ = &context;
    int w = width;
    int h = height;
    int comp = 4;
    const void *data = rgba;
    int quality = 95;
    success = stbi_write_jpg_to_func(func, context_, w, h, comp, data, quality);
    if (!success) xDie("Failed to stbi_write_jpg_to_func");

    return context.offset;
}

static size_t xToPNG(const void *rgba, int width, int height, size_t *outsize, void **outdata) {
    if (*outsize == 0) {
        *outsize = 1024;
        *outdata = std::malloc(*outsize);
    }

    stbiContext context;
    context.offset = 0;
    context.size = outsize;
    context.data = outdata;

    int success;
    stbi_write_func *func = stbiCallback;
    void *context_ = &context;
    int w = width;
    int h = height;
    int comp = 4;
    const void *data;
    int stride;
    std::tie(data, stride) = ({
        const void *data;
        const char *ptr = static_cast<const char *>(rgba);
        int bytesPerPixel = 4;
        int bytesPerRow = bytesPerPixel * w;
        data = ptr + bytesPerRow * (h - 1);

        int stride;
        stride = -1 * bytesPerRow;

        std::make_tuple(data, stride);
    });
    success = stbi_write_png_to_func(func, context_, w, h, comp, data, stride);
    if (!success) xDie("Failed to stbi_write_png_to_func");

    return context.offset;
}

static void __attribute__((unused)) xWriteBytes(const std::string &filename, size_t size, void *data) {
    std::FILE *file;
    file = fopen(filename.c_str(), "wb");
    if (!file) xDie("Failed to fopen: %s", filename.c_str());

    std::size_t nwrite;
    nwrite = std::fwrite(data, 1, size, file);
    if (nwrite < size) xDie("Failed to write all: %zu < %zu", nwrite, size);

    std::fclose(file);
}

template <typename T>
T xRead(std::istream &is=std::cin) {
    T x;
    is >> x;
    return x;
}


//---

template <class T>
static T xCommit(T& t) {
    ospCommit(t);
    return t;
}

template <class T>
static T xRetain(T& t) {
    ospRetain(t);
    return t;
}

struct BinaryFileData {
    std::filesystem::path path;
    OSPDataType type;
};

static OSPData xNew(const BinaryFileData &_) {
    size_t fileSize;
    const void *fileData;
    std::tie(fileSize, fileData) = ({
        std::FILE *file;
        const char *filename = _.path.c_str();
        const char *mode = "rb";
        file = fopen(filename, mode);
        if (file == nullptr) {
            return xWarn("Failed to fopen: %s", filename);
        }

        int rv = std::fseek(file, 0, SEEK_END);
        if (rv != 0) {
            return xWarn("Failed to fseek: %s", filename);
        }

        long nbyte;
        nbyte = std::ftell(file);
        if (nbyte < 0) {
            return xWarn("Failed to ftell: %s", filename);
        }

        {
            int rv = std::fseek(file, 0, SEEK_SET);
            if (rv) xDie("Failed to fseek: %s", filename);
        }

        void *data;
        data = new uint8_t[nbyte];
        for (size_t i=0, n=nbyte; i<n; ++i) {
            static_cast<uint8_t *>(data)[i] = 0x33;
        }
        std::size_t nread = std::fread(data, 1, nbyte, file);
        if (static_cast<std::size_t>(nread) < static_cast<std::size_t>(nbyte)) {
            return xWarn("Failed to read everything: %zu < %zu", nread, nbyte);
        }

        std::fclose(file);

        std::make_tuple(nread, data);
    });

    OSPData data;
    data = ({
        OSPData data;
        const void *sharedData = fileData;
        OSPDataType type = _.type;
        uint64_t numItems = ({
            uint64_t count;

            if (type == OSP_FLOAT) count = fileSize / sizeof(float) / 1;
            if (type == OSP_VEC2F) count = fileSize / sizeof(float) / 2;
            if (type == OSP_VEC3F) count = fileSize / sizeof(float) / 3;
            if (type == OSP_VEC4F) count = fileSize / sizeof(float) / 4;
            if (type == OSP_VEC4UI) count = fileSize / sizeof(uint32_t) / 4;

            if (count == 0) {
                return xWarn("Unexpected OSPDataType: %u", static_cast<uint32_t>(type));
            }

            count;
        });
        data = ospNewSharedData1D(sharedData, type, numItems);

        data;
    });

    return data;
}

struct Primary {
    BinaryFileData vertex_position;
    BinaryFileData vertex_color;
    BinaryFileData index;
};

static OSPGeometry xNew(const Primary &_) {
    OSPGeometry mesh = ({
        OSPGeometry geometry;
        const char *type = "mesh";
        geometry = ospNewGeometry(type);

        OSPData vertex_position = ({
            OSPData data;
            data = xNew(_.vertex_position);

            xCommit(data);
        });
        ospSetObject(geometry, "vertex.position", vertex_position);

        OSPData vertex_color = ({
            OSPData data;
            data = xNew(_.vertex_color);

            xCommit(data);
        });
        ospSetObject(geometry, "vertex.color", vertex_color);

        OSPData index = ({
            OSPData data;
            data = xNew(_.index);
        
            xCommit(data);
        });
        ospSetObject(geometry, "index", index);

        geometry;
    });

    return mesh;
}

struct Earth {
    BinaryFileData vertex_position;
    BinaryFileData vertex_color;
    BinaryFileData index;
};

static OSPGeometry xNew(const Earth &_) {
    OSPGeometry mesh = ({
        OSPGeometry geometry;
        const char *type = "mesh";
        geometry = ospNewGeometry(type);

        OSPData vertex_position = ({
            OSPData data;
            data = xNew(_.vertex_position);

            xCommit(data);
        });
        ospSetObject(geometry, "vertex.position", vertex_position);

        OSPData vertex_color = ({
            OSPData data;
            data = xNew(_.vertex_color);

            xCommit(data);
        });
        ospSetObject(geometry, "vertex.color", vertex_color);

        OSPData index = ({
            OSPData data;
            data = xNew(_.index);
        
            xCommit(data);
        });
        ospSetObject(geometry, "index", index);

        geometry;
    });

    return mesh;
}


static OSPFrameBuffer xNewFrameBuffer(int width, int height) {
    OSPFrameBuffer frameBuffer;
    OSPFrameBufferFormat format = OSP_FB_SRGBA;
    uint32_t channels = OSP_FB_COLOR;
    frameBuffer = ospNewFrameBuffer(width, height, format, channels);

    return frameBuffer;
}

static OSPFrameBuffer xGetFrameBuffer(int width, int height) {
    using Key = std::tuple<int, int>;
    static std::map<Key, OSPFrameBuffer> cache;
    Key key{width, height};

    if (cache.find(key) == cache.end()) {
        OSPFrameBuffer frameBuffer;
        frameBuffer = xNewFrameBuffer(width, height);

        cache[key] = xRetain(frameBuffer);
    }

    return cache[key];
}

struct Camera {
    std::string type;
    float *position;
    float *up;
    float *direction;
    float *imageStart;
    float *imageEnd;
};

static OSPCamera xNew(const Camera &_) {
    OSPCamera camera;
    camera = ospNewCamera(_.type.c_str());

    return camera;
}

static OSPCamera xGet(const Camera &_) {
    using Key = std::tuple<std::string>;
    static std::map<Key, OSPCamera> cache;

    Key key{_.type};
    if (cache.find(key) == cache.end()) {
        OSPCamera camera;
        camera = xNew(_);

        cache[key] = xRetain(camera);
    }

    OSPCamera camera;
    camera = cache[key];

    ospSetParam(camera, "position", OSP_VEC3F, _.position);
    ospSetParam(camera, "up", OSP_VEC3F, _.up);
    ospSetParam(camera, "direction", OSP_VEC3F, _.direction);
    ospSetParam(camera, "imageStart", OSP_VEC2F, _.imageStart);
    ospSetParam(camera, "imageEnd", OSP_VEC2F, _.imageEnd);

    return camera;
}

static OSPRenderer xNewRenderer(const std::string &type) {
    OSPRenderer renderer;
    renderer = ospNewRenderer(type.c_str());

    int pixelSamples[] = { 16 };
    ospSetParam(renderer, "pixelSamples", OSP_INT, pixelSamples);

    // int maxPathLength[] = { 60 };
    // ospSetParam(renderer, "maxPathLength", OSP_INT, maxPathLength);

    return renderer;
}

static OSPRenderer xGetRenderer(
    const std::string &type,
    float backgroundColor[4]
) {
    using Key = std::tuple<std::string>;
    static std::map<Key, OSPRenderer> cache;

    Key key{type};
    if (cache.find(key) == cache.end()) {
        OSPRenderer renderer;
        renderer = xNewRenderer(type);

        cache[key] = xRetain(renderer);
    }

    OSPRenderer renderer;
    renderer = cache[key];

    ospSetParam(renderer, "backgroundColor", OSP_VEC4F, backgroundColor);

    return renderer;
}

struct World {
    Primary primary;
    Earth earth;
};

static OSPWorld xNew(const World &_) {
    OSPWorld world;
    world = ospNewWorld();

    OSPInstance instance;
    instance = ({
        OSPInstance instance;
        instance = ospNewInstance(nullptr);

        OSPGroup group;
        group = ({
            OSPGroup group;
            group = ospNewGroup();

            OSPData geometry;
            geometry = ({
                OSPGeometricModel model[2];
                model[0] = ({
                    OSPGeometricModel model;
                    model = ospNewGeometricModel(nullptr);

                    OSPGeometry geometry;
                    geometry = ({
                        auto primary = xNew(_.primary);

                        xCommit(primary);
                    });
                    ospSetObject(model, "geometry", geometry);

                    xCommit(model);
                });

                model[1] = ({
                    OSPGeometricModel model;
                    model = ospNewGeometricModel(nullptr);

                    OSPGeometry geometry;
                    geometry = ({
                        auto earth = xNew(_.earth);

                        xCommit(earth);
                    });
                    ospSetObject(model, "geometry", geometry);

                    xCommit(model);
                });

                OSPData data = ({
                    OSPData src, dst;
                    const void *sharedData = model;
                    OSPDataType type = OSP_GEOMETRIC_MODEL;
                    uint64_t numItems = 2;
                    src = ospNewSharedData1D(model, type, numItems);
                    dst = ospNewData(type, numItems);

                    ospCopyData(src, dst);
                    ospRelease(src);

                    xCommit(dst);
                });

                xCommit(data);
            });
            ospSetObject(group, "geometry", geometry);

            xCommit(group);
        });
        ospSetObject(instance, "group", group);

        xCommit(instance);
    });
    ospSetObjectAsData(world, "instance", OSP_INSTANCE, instance);

    return world;
}

struct Image {
    std::string type;
    int width;
    int height;
    OSPFrameBuffer frameBuffer;
};

static std::tuple<size_t, void *> xGet(const Image &_) {
    const void *rgba;
    OSPFrameBufferChannel channel = OSP_FB_COLOR;
    rgba = ospMapFrameBuffer(_.frameBuffer, channel);

    static size_t size;
    static void *data;

    size_t length;
    if (_.type == "jpg") {
        length = xToJPG(rgba, _.width, _.height, &size, &data);

    } else if (_.type == "png") {
        length = xToPNG(rgba, _.width, _.height, &size, &data);

    } else {
        xDie("Unrecognized image type: %s", _.type.c_str());
    }

    ospUnmapFrameBuffer(rgba, _.frameBuffer);

    return std::make_tuple(length, data);
}


static void xErrorCallback(void *userData, OSPError error, const char *errorDetails) {
    (void)userData;

    std::fprintf(stderr, "OSPError (%d): %s\n", (int)error, errorDetails);
}

static void xStatusCallback(void *userData, const char *messageText) {
    (void)userData;

    std::fprintf(stderr, "OSPStatus: %s\n", messageText);
}

int main(int argc, const char **argv) {
    OSPError ospInitError = ospInit(&argc, argv);
    if (ospInitError) {
        xDie("Failed to ospInit: %d", ospInitError);
    }

    OSPDevice device;
    device = ({
        OSPDevice device;
        device = ospGetCurrentDevice();

        OSPErrorCallback errorCallback = xErrorCallback;
        void *userData = nullptr;
        ospDeviceSetErrorCallback(device, errorCallback, userData);

        OSPStatusCallback statusCallback = xStatusCallback;
        ospDeviceSetStatusCallback(device, statusCallback, userData);

        ospDeviceCommit(device);
        device;
    });

    (void)device;

    int width = 512;
    int height = 512;

    OSPFrameBuffer frameBuffer;
    frameBuffer = xGetFrameBuffer(width, height);

    OSPWorld world;
    world = ({
        auto world = xNew(World{
            .primary{
                .vertex_position{
                    .path{ "data/OSPGeometry.mesh.vertex.position.vec3f.bin" },
                    .type{ OSP_VEC3F },
                },
                .vertex_color{
                    .path{ "data/OSPGeometry.mesh.vertex.color.vec4f.bin" },
                    .type{ OSP_VEC4F },
                },
                .index{
                    .path{ "data/OSPGeometry.mesh.index.vec4ui.bin" },
                    .type{ OSP_VEC4UI },
                },
            } /* primary */,

            .earth{
                .vertex_position{
                    .path{ "data/earth/OSPGeometry.mesh.vertex.position.vec3f.bin" },
                    .type{ OSP_VEC3F },
                },
                .vertex_color{
                    .path{ "data/earth/OSPGeometry.mesh.vertex.color.vec3f.bin" },
                    .type{ OSP_VEC3F },
                },
                .index{
                    .path{ "data/earth/OSPGeometry.mesh.index.vec4ui.bin" },
                    .type{ OSP_VEC4UI },
                },
            } /* earth */,
        });

        xCommit(world);
    });

    (void)({
        OSPBounds bounds;
        bounds = ospGetBounds(world);

        std::fprintf(stderr, "bounds: %f %f %f ;; %f %f %f\n",
        bounds.lower[0],
        bounds.lower[1],
        bounds.lower[2],
        bounds.upper[0],
        bounds.upper[1],
        bounds.upper[2]);
    });

    OSPRenderer renderer;
    renderer = ({
        OSPRenderer renderer;
        const char *type = "ao";
        float backgroundColor[4] = { 0.0, 0.0, 0.0, 0.0 };
        renderer = xGetRenderer(type, backgroundColor);

        xCommit(renderer);
    });

    OSPCamera camera;
    std::string action;
    while (std::cin >> action) {
        // std::fprintf(stderr, "Action: %s\n", action.c_str());
        // std::fflush(stderr);

        if (action == "camera") {
            camera = ({
                OSPCamera camera;
                const char *type = "perspective";
                float position[3];
                position[0] = xRead<float>();
                position[1] = xRead<float>();
                position[2] = xRead<float>();
                float up[3];
                up[0] = xRead<float>();
                up[1] = xRead<float>();
                up[2] = xRead<float>();
                float direction[3];
                direction[0] = xRead<float>();
                direction[1] = xRead<float>();
                direction[2] = xRead<float>();
                float imageStart[2];
                imageStart[0] = xRead<float>(); // left
                imageStart[1] = xRead<float>(); // bottom
                float imageEnd[2];
                imageEnd[0] = xRead<float>(); // right
                imageEnd[1] = xRead<float>(); // top
                camera = xGet(Camera{
                    .type{ type },
                    .position{ position },
                    .up{ up },
                    .direction{ direction },
                    .imageStart{ imageStart },
                    .imageEnd{ imageEnd },
                });

                xCommit(camera);
            });
        
        } else if (action == "render") {
            // std::fprintf(stderr, "Before render\n");
            // std::fflush(stderr);
            ospRenderFrameBlocking(frameBuffer, renderer, camera, world);
            // std::fprintf(stderr, "After render\n");
            // std::fflush(stderr);

            size_t imageLength;
            void *imageData;
            std::tie(imageLength, imageData) = xGet(Image{
                .type{ "png" },
                .width{ width },
                .height{ height },
                .frameBuffer{ frameBuffer },
            });

            std::cout.write(reinterpret_cast<const char *>(&imageLength), sizeof(imageLength));
            std::cout.write(static_cast<const char *>(imageData), imageLength);

        } else {
            xDie("Unrecognized action: %s", action.c_str());
        
        }
    }

    return 0;
}
