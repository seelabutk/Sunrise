cmake_minimum_required(VERSION 3.22)
project(Tapestry)


find_package(ospray REQUIRED)


add_library(stb
    INTERFACE
)
target_include_directories(stb
    SYSTEM
    INTERFACE
        external/stb
)
target_compile_definitions(stb
    INTERFACE
        STB_IMAGE_WRITE_IMPLEMENTATION
)


add_executable(main
    src/main.cpp
)
target_link_libraries(main
    PUBLIC
        ospray::ospray
    PRIVATE
        stb
)

install(
    PROGRAMS
        "${CMAKE_CURRENT_BINARY_DIR}/main"
    TYPE BIN
    RENAME
        "sunrise"
)
