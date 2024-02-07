#pragma once
#include "defines.h"
#include "http_defines.h"

#include <memory>
#include <cstdio>

namespace http {

class HTTPController {
public:
    virtual void test_override() {
        printf("BASE CLASS\n");
    }

    template<typename T>
    static std::unique_ptr<T> create_new(const char* route);
protected:
    char m_route[150]; // char array to store the route -- this should be enough
                           // If the specified route is too long then there will be an error
private:
};

}

#include "controller.inl"