#pragma once
#include "defines.h"
#include "http_defines.h"

#include <vector>

namespace http 
{

class HTTPRequest {
public:
    static HTTPRequest create_new(const std::vector<char>& request);

private:
    HTTPRequest() {}

    std::vector<char> m_method;
    std::vector<char> m_uri;
    std::vector<char> m_version;
};

}