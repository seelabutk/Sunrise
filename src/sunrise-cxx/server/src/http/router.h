#pragma once
#include "defines.h"
#include "http_defines.h"
#include "request_handler.h"

#include <vector>

namespace http {

class Router{
public:
    Router();
    ~Router();

    void register_route(
        std::string route,
        method::request_method_e method
    );

    void route_request();

private:
    // TODO: 
};

}