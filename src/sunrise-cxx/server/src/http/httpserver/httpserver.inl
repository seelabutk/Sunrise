#include "httpserver.h"

namespace http {

/// @brief Register a controller to handle routes
/// @param controller the controller 
/// @return the server itself
template <typename T>
HTTPServer HTTPServer::register_route_controller(
    std::unique_ptr<HTTPController<T>> controller
) {
    return *this;
}

}
