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

struct Mesh {
    BinaryFileData vertex_position;
    BinaryFileData index;
};

static OSPGeometry xNew(const Mesh &_) {
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
    uint32_t channels = OSP_FB_COLOR | OSP_FB_ACCUM;
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

static OSPCamera xNewCamera(
    const std::string &type
) {
    OSPCamera camera;
    camera = ospNewCamera(type.c_str());

    return camera;
}

static OSPCamera xGetCamera(
    const std::string &type,
    float position[3],
    float up[3],
    float direction[3],
    float imageStart[2],
    float imageEnd[2]
) {
    using Key = std::tuple<std::string>;
    static std::map<Key, OSPCamera> cache;

    Key key = std::make_tuple(type);
    if (cache.find(key) == cache.end()) {
        OSPCamera camera;
        camera = xNewCamera(type);

        ospRetain(camera);
        cache[key] = camera;
    }

    OSPCamera camera;
    camera = cache[key];

    ospSetParam(camera, "position", OSP_VEC3F, position);
    ospSetParam(camera, "up", OSP_VEC3F, up);
    ospSetParam(camera, "direction", OSP_VEC3F, direction);
    ospSetParam(camera, "imageStart", OSP_VEC2F, imageStart);
    ospSetParam(camera, "imageEnd", OSP_VEC2F, imageEnd);

    return camera;
}

static OSPRenderer xNewRenderer(const std::string &type) {
    OSPRenderer renderer;
    renderer = ospNewRenderer(type.c_str());

    int pixelSamples[] = { 2 };
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

                OSPGeometricModel geometry = ({
                    OSPGeometricModel model;
                    model = ospNewGeometricModel(nullptr);

                    OSPGeometry geometry;
                    geometry = ({
                        auto mesh = xNew(Mesh{
                            .vertex_position{
                                .path{ "data/OSPGeometry.mesh.vertex.position.vec3f.bin" },
                                .type{ OSP_VEC3F },
                            },
                            .index{
                                .path{ "data/OSPGeometry.mesh.index.vec4ui.bin" },
                                .type{ OSP_VEC4UI },
                            },
                        });

                        xCommit(mesh);
                    });
                    ospSetObject(model, "geometry", geometry);

                    xCommit(model);
                });
                ospSetObjectAsData(group, "geometry", OSP_GEOMETRIC_MODEL, geometry);

                xCommit(group);
            });
            ospSetObject(instance, "group", group);

            xCommit(instance);
        });
        ospSetObjectAsData(world, "instance", OSP_INSTANCE, instance);

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
        float backgroundColor[4] = { 0.7, 0.3, 0.7, 1.0 };
        renderer = xGetRenderer(type, backgroundColor);

        xCommit(renderer);
    });

    OSPCamera camera;
    camera = ({
        OSPCamera camera;
        const char *type = "perspective";
        float position[3] = {
            // 593.2446088154106, 3715.2960740949684, -5153.813822396572,  // head-on view above middle of GSMNP
// 605.4723018876853, 3698.6337364380356, -5156.950336713477 // south of GSMNP
// 568.6076171767648, 3708.727634179291, -5153.896556311878 // trail
568.4292304733369, 3707.5641117842542, -5152.27964758833
            // /* x */ 544542.9623210428 / 1000.0,
            // /* y */ 3742697.586061448 / 1000.0,
            // /* z */ -5128164.558736043 / 1000.0,
        };
        float up[3] = {
            568.4292304733369, 3707.5641117842542, -5152.27964758833
            // 0.0, 1.0, 0.0  // simple
        };
        float direction[3] = {
            // -position[0], -position[1], -position[2],  // head-on view
            3.9733260879521595, 0.3637315000100898, 1.3202542093249576
            // 3.839851315207852, -0.5088589340002727, 2.5330076254285814 // trail
// -12.971456882104349, 12.004389280069972, 9.597964023717395// from south to middle
        };
        float imageStart[2] = { 0.0, 0.0 };
        float imageEnd[2] = { 1.0, 1.0 };
        camera = xGetCamera(type, position, up, direction, imageStart, imageEnd);

        xCommit(camera);
    });

    ({
        using Clock = std::chrono::steady_clock;

        Clock::time_point beforeRender = Clock::now();
        ospResetAccumulation(frameBuffer);
        ospRenderFrameBlocking(frameBuffer, renderer, camera, world);
        Clock::time_point afterRender = Clock::now();

        Clock::time_point beforeEncode = Clock::now();

        size_t imageLength;
        void *imageData;
        std::tie(imageLength, imageData) = ({
            const void *rgbaOriginal;
            OSPFrameBufferChannel channel = OSP_FB_COLOR;
            rgbaOriginal = ospMapFrameBuffer(frameBuffer, channel);

            std::vector<uint8_t> rgba(static_cast<const uint8_t *>(rgbaOriginal), static_cast<const uint8_t *>(rgbaOriginal) + 4 * width * height);
            // for (int i=0, n=width*height; i<n; ++i) {
            //     float ratio = rgba[4*i+3] / 255.0f;
            //     for (int j=0; j<4; ++j) {
            //         float f = rgba[4*i+j] * ratio + 0.0 * (1.0f - ratio);
            //         uint8_t u = f >= 255.0f ? 255 : f <= 0.0 ? 0 : static_cast<uint8_t>(f);
            //         rgba[4*i+j] = u;
            //     }
            // }

            size_t length;
            static size_t size = 4UL * 1024UL * 1024UL;
            static void *data = std::malloc(size);
            length = xToPNG(rgba.data(), width, height, &size, &data);

            const char *filename = "out.png";
            xWriteBytes(filename, length, data);
            std::fprintf(stdout, "Wrote %zu bytes to %s\n", length, filename);

            // stbi_write_png("out.png", 256, 256, 4, rgba, 0);

            ospUnmapFrameBuffer(rgbaOriginal, frameBuffer);

            std::make_tuple(length, data);
        });

        Clock::time_point afterEncode = Clock::now();

        using TimeUnit = std::chrono::microseconds;
        size_t renderDuration = std::chrono::duration_cast<TimeUnit>(afterRender - beforeRender).count();
        size_t encodeDuration = std::chrono::duration_cast<TimeUnit>(afterEncode - beforeEncode).count();
    });

    return 0;
}
