#pragma once
#include "http_defines.h"

#include <string>
#include <functional>

namespace http {

class RequestHandler {
public:
    RequestHandler() {}
    ~RequestHandler() {}

    template<typename T>
    static T* from(std::string route, method::request_method_e method) {
        T* h = new T();
        h->set_route(route);
        h->set_method(method);

        return h;
    }

    const std::string get_route() const { return m_route; }
    void set_route(std::string route) { m_route = route; }
    
    const method::request_method_e get_method() const { return m_method; }
    void set_method(method::request_method_e method) { m_method = method; }

protected:
    method::request_method_e m_method;
    std::string m_route;

    virtual void callback_handler() = 0; // callback function to handle the incoming request
};

}