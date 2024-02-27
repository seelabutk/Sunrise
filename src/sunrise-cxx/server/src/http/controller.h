#pragma once
#include "defines.h"
#include "http_defines.h"

#include <memory>
#include <vector>
#include <string>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <type_traits>

/// Macros for adding routes to the controller
#define HTTP_METHOD_LIST_BEGIN      \
        static void register_routes() {

#define HTTP_METHOD_ADD(method, pattern)    \
        register_method(&method, pattern)

#define HTTP_METHOD_LIST_END        \
        return;                     \
        }

namespace http {

/// @brief HTTP Controller base clase
/// @tparam T the type of the derived class
template <typename T>
class HTTPController {
public:
    // below fails for some reason
    // static_assert(std::derived_from<T, HTTPController<T>> == true);

    static std::unique_ptr<T> create_new() {
        std::unique_ptr<T> controller = std::make_unique<T>();
    
        return controller;
    }
protected:
    template <typename FUNC>
    static void register_method(
        FUNC&& function,
        const std::string &pattern
    ) {

    }
private:
    virtual void handle_http_request() {};

};

}