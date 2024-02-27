#include "request.h"

#include <cstdio>

namespace http
{

HTTPRequest HTTPRequest::create_new(const std::vector<char>& request_data) {
    HTTPRequest req = HTTPRequest();
    i32 t = 0;

    req.m_method.reserve(400);
    req.m_uri.reserve(400);
    req.m_version.reserve(400);

    t = std::sscanf(request_data.data(), "%s %s %s"
        , req.m_method.data()
        , req.m_uri.data()
        , req.m_version.data()
    );

    if (t != 3) {
        fprintf(stderr, "ERROR: failed to parse HTTP Request\n");
        return req;
    }

    return req;

    return req;
}

}