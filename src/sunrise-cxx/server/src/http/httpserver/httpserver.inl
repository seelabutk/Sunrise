#include "httpserver.h"

namespace http {


// /// @brief register a handler that will handle logic for the specified request route
// /// @param handler pointer to the handler to register
// /// @return the server itself
// template<typename F>
// HTTPServer HTTPServer::register_handler(std::string route, F callback) { 
//     return *this;
// }

// template<typename...T>
// HTTPServer HTTPServer::register_handler(std::string route, const route_callback<T...>& callback) { 
//     return *this;
// }

// template<typename...T>
// HTTPServer HTTPServer::register_handler(
//     std::string route, 
//     std::function<void(Request* req, Response* res, T...)> callback
// ) { 
//     return *this;
// }

HTTPServer HTTPServer::register_handler(
    std::string route,
    const std::function<void()>& callback
) {
    return *this;
}

}