#pragma once
#include "defines.h"
#include "http_defines.h"

#include <vector>

namespace http 
{

struct ResponseHeader {
    std::vector<char> status;
    std::vector<char> content_length;
    std::vector<char> content_type;
};

struct ResponseBody {
    std::vector<char> data;
    std::size_t data_size;
};

class HTTPResponse {
public:
    static HTTPResponse create_new();
private:
    ResponseHeader m_headers;
    ResponseBody m_body;
    std::size_t m_data_size;
};

}