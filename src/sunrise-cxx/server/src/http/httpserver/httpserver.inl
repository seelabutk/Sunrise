#include "httpserver.h"

namespace http {

/// @brief register a handler that will handle logic for the specified request route
/// @param handler pointer to the handler to register
/// @return the server itself
template<typename F>
HTTPServer HTTPServer::register_handler(std::string route, F callback) { 
    callback();
    return *this;
}

}