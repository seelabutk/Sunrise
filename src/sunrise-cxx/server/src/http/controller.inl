#pragma once

#include "controller.h"

#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <type_traits>

namespace http {

template <typename Type>
std::unique_ptr<Type> HTTPController<T>::create_new(const char* route) {
    static_assert(std::derived_from<Type, HTTPController<T>> == true);

    if (strlen(route) > 149) {
        fprintf(stderr, "HTTPController::create_new() -> Specified route is too long: %lu", strlen(route));
        exit(1);
    }

    std::unique_ptr<Type<T> > controller = std::make_unique<Type<T> >();
    strcpy(controller->m_route, route);

    printf("New Route: %s Len: %lu\n", controller->m_route, strlen(controller->m_route));

    return controller;
}

}
